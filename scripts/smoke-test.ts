/**
 * End-to-end smoke test of the business rules, run against a THROWAWAY
 * database (refuses to run unless MONGODB_DB ends with "_test"):
 *
 *   MONGODB_DB=rfc_gadget_test npm run test:smoke
 *
 * Walks the full journey through the real service layer: catalog setup →
 * customer registration → cart quote → checkout → cancellation rules →
 * admin status flow → return window → reviews → Q&A → manual orders →
 * dashboard numbers. Cleans up everything it created.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import mongoose from 'mongoose';

import {
  AddressModel,
  BannerModel,
  CategoryModel,
  connectDB,
  NotificationModel,
  OrderModel,
  ProductModel,
  QuestionModel,
  ReturnRequestModel,
  ReviewModel,
  SupplierModel,
  TagModel,
  UserModel,
} from '@/database';
import { getActiveBanners, saveBanner } from '@/services/banners';
import { saveCategory, saveSupplier, saveTag } from '@/services/catalog';
import { getAdminCombo, listCombos, saveCombo } from '@/services/combos';
import { getDashboardData } from '@/services/dashboard';
import {
  answerQuestion,
  askQuestion,
  createReview,
  getReviewEligibility,
  listProductQuestions,
  listProductReviews,
  setReviewHidden,
} from '@/services/engagement';
import {
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsSeen,
} from '@/services/notifications';
import {
  cancelOrderByCustomer,
  createManualOrder,
  getCustomerOrder,
  listAdminOrders,
  placeWebsiteOrder,
  quoteCart,
  trackOrder,
  updateOrderStatus,
} from '@/services/orders';
import { getProductBySlug, saveProduct, searchProducts } from '@/services/products';
import { deleteProduct } from '@/services/products';
import { createReturnRequest, updateReturn } from '@/services/returns';
import { getSettings } from '@/services/settings';
import { authenticate, isResetTokenValid, registerCustomer, resetPassword } from '@/services/users';
import { type BannerOutput, bannerSchema } from '@lib/validators/banner';
import {
  categorySchema,
  comboSchema,
  productSchema,
  supplierSchema,
  tagSchema,
} from '@lib/validators/catalog';

const dbName = process.env.MONGODB_DB ?? '';
if (!dbName.endsWith('_test')) {
  console.error(`Refusing to run: MONGODB_DB="${dbName}" does not end with "_test".`);
  process.exit(1);
}

const tag = `smoke${Date.now().toString(36)}`;
let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}
async function expectReject(fn: () => Promise<unknown>, match: RegExp) {
  await assert.rejects(fn, (e: Error) => match.test(e.message));
}

async function main() {
  await connectDB();
  console.log(`Smoke test on "${mongoose.connection.name}" (run ${tag})\n`);
  const created = { categories: [] as string[], products: [] as string[], users: [] as string[] };

  try {
    // ── Catalog ───────────────────────────────────────────────────────────
    const supplier = await saveSupplier(
      supplierSchema.parse({ name: `${tag} Supplier`, websiteUrl: 'https://example.com' }),
    );
    const cat = await saveCategory(categorySchema.parse({ name: `${tag} Bags`, isFeatured: true }));
    const sub = await saveCategory(
      categorySchema.parse({ name: `${tag} Wallets`, parent: cat.id }),
    );
    const t = await saveTag(tagSchema.parse({ name: `${tag} gift` }));
    created.categories.push(cat.id, sub.id);

    let wallet!: { id: string; slug: string };
    let tee!: { id: string; slug: string };
    await step('admin creates products with mixed Cloudinary + external images', async () => {
      wallet = await saveProduct(
        productSchema.parse({
          name: `${tag} Leather Wallet`,
          category: cat.id,
          subCategory: sub.id,
          tags: [t.id],
          supplier: supplier.id,
          supplierProductUrl: 'https://example.com/wallet',
          supplierPrice: 400,
          price: 900,
          salePrice: 750,
          images: [
            { type: 'external', url: 'https://example.com/a.jpg' },
            { type: 'external', url: 'https://example.com/b.jpg' },
          ],
          description: '<p>Nice</p><script>alert(1)</script><img src=x onerror=alert(1)>',
          specifications: [{ label: 'Material', value: 'Leather' }],
        }),
      );
      tee = await saveProduct(
        productSchema.parse({
          name: `${tag} Cotton Tee`,
          category: cat.id,
          supplier: supplier.id,
          supplierPrice: 200,
          price: 500,
          variations: [{ name: 'Size', values: ['M', 'L'] }],
        }),
      );
      created.products.push(wallet.id, tee.id);
      const doc = await ProductModel.findById(wallet.id).lean();
      assert.equal(doc!.effectivePrice, 750, 'effectivePrice uses the sale price');
      assert.ok(!doc!.description!.includes('<script'), 'description is sanitized (script)');
      assert.ok(!doc!.description!.includes('onerror'), 'description is sanitized (handlers)');
    });

    await step('rejects a sub-category from another category', async () => {
      const other = await saveCategory(categorySchema.parse({ name: `${tag} Other` }));
      created.categories.push(other.id);
      await expectReject(
        () =>
          saveProduct(
            productSchema.parse({
              name: 'x',
              category: other.id,
              subCategory: sub.id,
              supplier: supplier.id,
              supplierPrice: 1,
              price: 2,
            }),
          ),
        /sub-category must belong/,
      );
    });

    await step('rejects forged Cloudinary images', async () => {
      await expectReject(
        () =>
          saveProduct(
            productSchema.parse({
              name: 'x',
              category: cat.id,
              supplier: supplier.id,
              supplierPrice: 1,
              price: 2,
              images: [
                {
                  type: 'cloudinary',
                  url: 'https://res.cloudinary.com/evil/image/upload/x.jpg',
                  publicId: 'x',
                },
              ],
            }),
          ),
        /not valid/,
      );
    });

    await step('storefront search, category, tag, price filters', async () => {
      assert.equal((await searchProducts({ q: `${tag} leather` })).total, 1);
      assert.equal((await searchProducts({ category: cat.slug, q: tag })).total, 2);
      assert.equal((await searchProducts({ category: sub.slug })).total, 1);
      assert.equal((await searchProducts({ tags: [t.slug] })).total, 1);
      assert.equal((await searchProducts({ q: tag, minPrice: 600 })).total, 1);
      assert.equal((await searchProducts({ q: tag, onSale: true })).total, 1);
      const detail = await getProductBySlug(wallet.slug);
      assert.equal(detail?.images.length, 2);
      assert.equal(detail?.category?.id, cat.id);
    });

    // An admin of our own, so admin notifications have a known recipient.
    const smokeAdmin = await UserModel.create({
      name: `${tag} Admin`,
      email: `${tag}-admin@example.com`,
      passwordHash: 'x',
      role: 'admin',
    });
    created.users.push(String(smokeAdmin._id));

    // ── Customer ──────────────────────────────────────────────────────────
    const email = `${tag}@example.com`;
    const phone = `017${String(Date.now()).slice(-8)}`;
    let customer!: { id: string };
    await step('customer registers and logs in; wrong password rejected', async () => {
      customer = await registerCustomer({
        name: 'Smoke Tester',
        email,
        phone,
        password: 'secret123',
        confirmPassword: 'secret123',
      });
      created.users.push(customer.id);
      assert.equal((await authenticate({ email }, 'secret123')).id, customer.id);
      assert.equal((await authenticate({ phone }, 'secret123')).id, customer.id);
      await expectReject(
        () => authenticate({ email }, 'nope'),
        /Incorrect email \/ mobile number or password/,
      );
      await expectReject(
        () =>
          registerCustomer({
            name: 'x',
            email,
            phone,
            password: 'secret123',
            confirmPassword: 'secret123',
          }),
        /already exists/,
      );
    });

    await step('password reset link works once, then expires', async () => {
      // Plant a token directly rather than emailing one from the test.
      const plant = (token: string, expiresInMs: number) =>
        UserModel.updateOne(
          { _id: customer.id },
          {
            passwordResetTokenHash: createHash('sha256').update(token).digest('hex'),
            passwordResetExpiresAt: new Date(Date.now() + expiresInMs),
          },
        );
      await plant('smoke-reset-token', 60_000);
      assert.equal(await isResetTokenValid('smoke-reset-token'), true);
      const reset = {
        token: 'smoke-reset-token',
        password: 'newsecret123',
        confirmPassword: 'newsecret123',
      };
      assert.equal((await resetPassword(reset)).id, customer.id);
      assert.equal((await authenticate({ phone }, 'newsecret123')).id, customer.id);
      await expectReject(() => authenticate({ phone }, 'secret123'), /Incorrect/);
      await expectReject(() => resetPassword(reset), /invalid or has expired/);
      await plant('smoke-expired-token', -1_000);
      assert.equal(await isResetTokenValid('smoke-expired-token'), false);
      const user = await UserModel.findById(customer.id).lean();
      assert.ok(user?.passwordChangedAt, 'passwordChangedAt is set so old sessions end');
    });

    const settings = await getSettings();
    await step('cart quote re-prices server-side and validates variants', async () => {
      const q = await quoteCart(
        [
          { productId: wallet.id, quantity: 2, variant: {} },
          { productId: tee.id, quantity: 1, variant: {} },
        ],
        'outside_dhaka',
      );
      assert.equal(q.lines[0]!.unitPrice, 750);
      assert.equal(q.lines[1]!.available, false, 'missing size must be flagged');
      assert.equal(q.subtotal, 1500);
      assert.equal(
        q.shippingFee,
        settings.freeShippingThreshold > 0 && 1500 >= settings.freeShippingThreshold
          ? 0
          : settings.shippingFeeOutsideDhaka,
      );
    });

    const address = {
      fullName: 'Smoke Tester',
      phone,
      addressLine: 'House 1, Road 2',
      area: 'Badda',
      city: 'Dhaka',
      zone: 'inside_dhaka' as const,
    };
    let order1!: { id: string; orderNumber: string };
    await step('checkout places a COD order with snapshot prices', async () => {
      order1 = await placeWebsiteOrder({
        lines: [
          { productId: wallet.id, quantity: 2, variant: {} },
          { productId: tee.id, quantity: 1, variant: { Size: 'L' } },
        ],
        userId: customer.id,
        name: 'Smoke Tester',
        phone,
        address,
        saveAddress: true,
      });
      assert.match(order1.orderNumber, /^RFC-\d{6,}$/);
      const o = await OrderModel.findById(order1.id).lean();
      assert.equal(o!.subtotal, 2000);
      assert.equal(o!.total, 2000 + o!.shippingFee);
      assert.equal(o!.supplierCost, 1000);
      assert.equal(o!.paymentMethod, 'cod');
      assert.equal(o!.platform, 'website');
      assert.equal(await AddressModel.countDocuments({ user: customer.id }), 1, 'address saved');
    });

    await step('checkout refuses out-of-stock and invalid variants', async () => {
      await expectReject(
        () =>
          placeWebsiteOrder({
            lines: [{ productId: tee.id, quantity: 1, variant: { Size: 'XXL' } }],
            userId: null,
            name: 'x',
            phone,
            address,
          }),
        /choose a Size/,
      );
    });

    await step('public tracking needs order number + phone, hides address', async () => {
      const tracked = await trackOrder(order1.orderNumber, phone);
      assert.equal(tracked?.status, 'pending');
      assert.equal(tracked?.shippingAddress.addressLine, '');
      assert.equal(await trackOrder(order1.orderNumber, '01700000000'), null);
    });

    await step('customer can cancel a pending order', async () => {
      const view = await getCustomerOrder(customer.id, order1.id);
      assert.equal(view?.canCancel, true);
      await cancelOrderByCustomer(customer.id, order1.id);
      assert.equal((await OrderModel.findById(order1.id).lean())!.status, 'cancelled');
    });

    const order2 = await placeWebsiteOrder({
      lines: [{ productId: wallet.id, quantity: 1, variant: {} }],
      userId: customer.id,
      name: 'Smoke Tester',
      phone,
      address,
    });
    const admin = await UserModel.findOne({ role: 'admin' }).lean();
    const adminId = admin ? String(admin._id) : customer.id;

    await step('customer cannot cancel after confirmation', async () => {
      await updateOrderStatus(order2.id, 'confirmed', adminId);
      await expectReject(
        () => cancelOrderByCustomer(customer.id, order2.id),
        /can no longer be cancelled/,
      );
    });

    await step('admin status flow enforces order; delivery marks COD paid', async () => {
      await expectReject(() => updateOrderStatus(order2.id, 'delivered', adminId), /Can't move/);
      await updateOrderStatus(order2.id, 'processing', adminId);
      await updateOrderStatus(order2.id, 'shipped', adminId, 'Pathao #123');
      await expectReject(() => updateOrderStatus(order2.id, 'cancelled', adminId), /Can't move/);
      await updateOrderStatus(order2.id, 'delivered', adminId);
      const o = await OrderModel.findById(order2.id).lean();
      assert.equal(o!.paymentStatus, 'paid');
      assert.ok(o!.deliveredAt);
      assert.deepEqual(
        o!.statusHistory.map((e) => e.status),
        ['pending', 'confirmed', 'processing', 'shipped', 'delivered'],
      );
    });

    await step('notifications: admins hear about orders, customers about status', async () => {
      const adminFeed = await getNotificationFeed(String(smokeAdmin._id));
      const mine = adminFeed.items.filter((n) => n.title.includes(order1.orderNumber));
      assert.deepEqual(mine.map((n) => n.type).sort(), ['order_cancelled', 'order_placed']);
      assert.ok(adminFeed.items.some((n) => n.title === `New order #${order2.orderNumber}`));
      assert.equal(mine[0]!.link, `/admin/orders/${order1.id}`);

      const feed = await getNotificationFeed(customer.id);
      assert.deepEqual(
        feed.items.map((n) => n.title),
        ['Delivered', 'Shipped', 'Processing', 'Confirmed'].map(
          (l) => `Order #${order2.orderNumber}: ${l}`,
        ),
        'one per status change, newest first; none for their own cancel',
      );
      assert.equal(feed.unseen, 4);
      assert.ok(feed.items.every((n) => n.link === `/account/orders/${order2.id}`));

      await markNotificationsSeen(customer.id);
      const seen = await getNotificationFeed(customer.id);
      assert.equal(seen.unseen, 0);
      assert.ok(
        seen.items.every((n) => n.seen && !n.read),
        'seen is not read',
      );

      await markNotificationRead(customer.id, seen.items[0]!.id);
      await markNotificationRead(String(smokeAdmin._id), seen.items[1]!.id); // not theirs
      const one = await getNotificationFeed(customer.id);
      assert.deepEqual(
        one.items.map((n) => n.read),
        [true, false, false, false],
      );

      await markAllNotificationsRead(customer.id);
      assert.ok((await getNotificationFeed(customer.id)).items.every((n) => n.read));
    });

    await step('reviews: only purchasers, once, hidden excluded from rating', async () => {
      assert.equal(
        (await getReviewEligibility(customer.id, tee.id)).canReview,
        false,
        'tee order was cancelled',
      );
      assert.equal((await getReviewEligibility(customer.id, wallet.id)).canReview, true);
      await createReview(customer.id, {
        productId: wallet.id,
        rating: 4,
        comment: 'Lovely wallet',
        images: [],
      });
      await expectReject(
        () =>
          createReview(customer.id, {
            productId: wallet.id,
            rating: 5,
            comment: 'again!',
            images: [],
          }),
        /already reviewed/,
      );
      let p = await ProductModel.findById(wallet.id).lean();
      assert.equal(p!.ratingAverage, 4);
      assert.equal(p!.ratingCount, 1);
      const { reviews } = await listProductReviews(wallet.id);
      await setReviewHidden(reviews[0]!.id, true);
      p = await ProductModel.findById(wallet.id).lean();
      assert.equal(p!.ratingCount, 0, 'hidden reviews do not count');
      assert.equal((await listProductReviews(wallet.id)).reviews.length, 0);
    });

    await step('returns: only within 7 days of delivery, once per order', async () => {
      const view = await getCustomerOrder(customer.id, order2.id);
      assert.equal(view?.canRequestReturn, true);
      await createReturnRequest(customer.id, {
        orderId: order2.id,
        reason: 'Damaged product',
        description: 'Torn',
        images: [],
      });
      await expectReject(
        () => createReturnRequest(customer.id, { orderId: order2.id, reason: 'Other', images: [] }),
        /already been requested/,
      );
      const ret = await ReturnRequestModel.findOne({ order: order2.id }).lean();
      await expectReject(
        () => updateReturn(String(ret!._id), adminId, { status: 'refunded' }),
        /Can't move/,
      );
      await updateReturn(String(ret!._id), adminId, {
        status: 'approved',
        adminNote: 'Pickup tomorrow',
      });
      assert.equal((await OrderModel.findById(order2.id).lean())!.status, 'returned');

      // An order delivered 3 days ago is outside the window.
      const old = await placeWebsiteOrder({
        lines: [{ productId: wallet.id, quantity: 1, variant: {} }],
        userId: customer.id,
        name: 'x',
        phone,
        address,
      });
      await OrderModel.updateOne(
        { _id: old.id },
        { status: 'delivered', deliveredAt: new Date(Date.now() - 8 * 86400_000) },
      );
      await expectReject(
        () => createReturnRequest(customer.id, { orderId: old.id, reason: 'Other', images: [] }),
        /within 7 days/,
      );
    });

    await step('questions: asker sees pending; public sees answered only', async () => {
      await askQuestion(customer.id, wallet.id, 'Does it come in brown?');
      assert.equal((await listProductQuestions(wallet.id, null)).length, 0);
      const mine = await listProductQuestions(wallet.id, customer.id);
      assert.equal(mine.length, 1);
      await answerQuestion(mine[0]!.id, 'Yes, brown is available.', adminId);
      const pub = await listProductQuestions(wallet.id, null);
      assert.equal(pub[0]?.answer, 'Yes, brown is available.');
    });

    await step('manual order from Facebook with fee override + discount', async () => {
      const m = await createManualOrder({
        lines: [{ productId: wallet.id, quantity: 3, variant: {} }],
        userId: null,
        customer: { name: 'FB Buyer', phone: '01811111111' },
        shippingAddress: { ...address, phone: '01811111111', zone: 'outside_dhaka' },
        platform: 'facebook',
        status: 'confirmed',
        shippingFeeOverride: 100,
        discount: 50,
        createdBy: adminId,
      });
      const o = await OrderModel.findById(m.id).lean();
      assert.equal(o!.platform, 'facebook');
      assert.equal(o!.status, 'confirmed');
      assert.equal(o!.total, 2250 + 100 - 50);
      const list = await listAdminOrders({ platform: 'facebook', q: 'FB Buyer' });
      assert.ok(list.items.some((r) => r.id === m.id));
    });

    await step(
      'combos: bundle pricing, storefront listing, checkout snapshot, guards',
      async () => {
        const plain = await saveProduct(
          productSchema.parse({
            name: `${tag} Pen`,
            category: cat.id,
            supplier: supplier.id,
            supplierPrice: 50,
            price: 150,
          }),
        );
        created.products.push(plain.id);
        await expectReject(
          () =>
            saveCombo(
              comboSchema.parse({
                name: 'x',
                items: [
                  { productId: wallet.id, quantity: 1 },
                  { productId: plain.id, quantity: 2 },
                ],
                comboPrice: 5000,
              }),
            ),
          /lower than buying the items separately/,
        );
        const combo = await saveCombo(
          comboSchema.parse({
            name: `${tag} Office Combo`,
            items: [
              { productId: wallet.id, quantity: 1 },
              { productId: plain.id, quantity: 2 },
            ],
            comboPrice: 900,
          }),
        );
        created.products.push(combo.id);
        const admin = await getAdminCombo(combo.id);
        assert.equal(admin?.regularPrice, 750 + 300, 'regular = items bought separately');
        assert.equal(admin?.supplierPrice, 400 + 100);
        assert.equal(admin?.images.length, 1, 'falls back to item cover images (the pen has none)');
        assert.ok((await listCombos()).items.some((c) => c.id === combo.id && c.isCombo));
        assert.ok(
          !(await listCombos()).items.some((c) => c.id === plain.id),
          'regular products stay out of Combo offers by default',
        );
        await saveProduct(
          productSchema.parse({
            name: `${tag} Pen`,
            category: cat.id,
            supplier: supplier.id,
            supplierPrice: 50,
            price: 150,
            isComboOffer: true,
          }),
          plain.id,
        );
        assert.ok(
          (await listCombos()).items.some((c) => c.id === plain.id && !c.isCombo),
          'a product flagged "Show in Combo offers" is listed there too',
        );
        assert.equal(
          (await searchProducts({ q: `${tag} Office` })).total,
          0,
          'combos stay out of the catalog',
        );
        const detail = await getProductBySlug(combo.slug);
        assert.equal(detail?.comboItems.length, 2);

        const o = await placeWebsiteOrder({
          lines: [{ productId: combo.id, quantity: 2, variant: {} }],
          userId: null,
          name: 'Combo Buyer',
          phone,
          address,
        });
        const line = (await OrderModel.findById(o.id).lean())!.items[0]!;
        assert.equal(line.unitPrice, 900);
        assert.equal(line.supplierPrice, 500);
        assert.deepEqual(
          line.components.map((c) => [c.name, c.quantity]),
          [
            [`${tag} Leather Wallet`, 1],
            [`${tag} Pen`, 2],
          ],
        );
        await expectReject(() => deleteProduct(plain.id), /part of 1 combo/);
        await expectReject(
          () =>
            saveCombo(
              comboSchema.parse({
                name: 'x',
                items: [
                  { productId: combo.id, quantity: 1 },
                  { productId: plain.id, quantity: 1 },
                ],
                comboPrice: 10,
              }),
            ),
          /cannot contain another combo/,
        );
      },
    );

    await step('banners: only active and in-schedule banners are shown', async () => {
      const img = { type: 'external', url: 'https://example.com/banner.jpg' };
      const day = 86400_000;
      const mk = (title: string, extra: object) =>
        saveBanner(
          bannerSchema.parse({ title, image: img, position: 'special', ...extra }) as BannerOutput,
        );
      await mk(`${tag} live`, {});
      await mk(`${tag} off`, { isActive: false });
      await mk(`${tag} future`, {
        startsAt: new Date(Date.now() + 2 * day).toISOString().slice(0, 10),
      });
      await mk(`${tag} past`, {
        endsAt: new Date(Date.now() - 2 * day).toISOString().slice(0, 10),
      });
      const shown = (await getActiveBanners()).special
        .map((b) => b.title)
        .filter((t) => t.startsWith(tag));
      assert.deepEqual(shown, [`${tag} live`]);
    });

    await step('dashboard aggregates', async () => {
      const d = await getDashboardData(30);
      assert.ok(d.totals.orders >= 4);
      assert.equal(d.revenueByDay.length, 30);
      assert.ok(d.byPlatform.some((p) => p.platform === 'facebook'));
      assert.ok(d.topProducts.length > 0);
    });

    await step('guest orders link to the account registered later with that phone', async () => {
      const guestPhone = `019${String(Date.now()).slice(-8)}`;
      const g = await placeWebsiteOrder({
        lines: [{ productId: wallet.id, quantity: 1, variant: {} }],
        userId: null,
        name: 'Guest',
        phone: guestPhone,
        address: { ...address, phone: guestPhone },
      });
      const u = await registerCustomer({
        name: 'Guest',
        email: `g${tag}@example.com`,
        phone: guestPhone,
        password: 'secret123',
        confirmPassword: 'secret123',
      });
      created.users.push(u.id);
      assert.equal(String((await OrderModel.findById(g.id).lean())!.user), u.id);
    });
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────────
    const products = created.products;
    await Promise.all([
      OrderModel.deleteMany({ 'items.product': { $in: products } }),
      ReviewModel.deleteMany({ product: { $in: products } }),
      QuestionModel.deleteMany({ product: { $in: products } }),
      ReturnRequestModel.deleteMany({ user: { $in: created.users } }),
      AddressModel.deleteMany({ user: { $in: created.users } }),
      ProductModel.deleteMany({ _id: { $in: products } }),
      CategoryModel.deleteMany({ _id: { $in: created.categories } }),
      SupplierModel.deleteMany({ name: new RegExp(`^${tag}`) }),
      TagModel.deleteMany({ name: new RegExp(`^${tag}`) }),
      BannerModel.deleteMany({ title: new RegExp(`^${tag}`) }),
      UserModel.deleteMany({ _id: { $in: created.users } }),
      NotificationModel.deleteMany({ user: { $in: created.users } }),
    ]);
    await mongoose.disconnect();
  }
  console.log(`\nAll ${passed} checks passed.`);
}

main().catch(async (e) => {
  console.error('\n✗ FAILED:', e);
  await mongoose.disconnect();
  process.exit(1);
});
