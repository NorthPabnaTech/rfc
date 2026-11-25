/**
 * Reseller money rules, run against a THROWAWAY database (refuses to run
 * unless MONGODB_DB ends with "_test"):
 *
 *   MONGODB_DB=rfc_gadget_test npm run test:reseller
 *
 * Uses a MANUAL supplier only, so no SupplierOrder is ever created and no
 * supplier API is ever called. The Paymently gateway is replaced by a fake
 * verifier, so no network payment call is made either.
 *
 * Covers: invoice-verified deposits (+ idempotency), price snapshots,
 * expectedResellerPrice 409, server-side money validation, delivery payment
 * mode / COD, exactly-once profit and refund, withdrawal fees and
 * exactly-once rejection refunds, token revocation.
 */
import assert from 'node:assert/strict';

import mongoose from 'mongoose';

import {
  CategoryModel,
  connectDB,
  OrderModel,
  ProductModel,
  ResellerModel,
  SettingsModel,
  SupplierModel,
  WalletTransactionModel,
} from '@/database';
import { saveCategory, saveSupplier } from '@/services/catalog';
import { updateOrderStatus } from '@/services/orders';
import { saveProduct } from '@/services/products';
import {
  cancelResellerOrder,
  creditResellerDepositFromInvoice,
  placeResellerOrder,
  processResellerWithdrawal,
  requestResellerWithdrawal,
  revokeResellerTokens,
  settleResellerOrderOnStatusChange,
} from '@/services/resellers';
import { signResellerToken, verifyResellerToken } from '@lib/auth/reseller-auth';
import type { PaymentlyVerifyResult } from '@lib/payments/paymently';
import { categorySchema, productSchema, supplierSchema } from '@lib/validators/catalog';

const dbName = process.env.MONGODB_DB ?? '';
if (!dbName.endsWith('_test')) {
  console.error(`Refusing to run: MONGODB_DB="${dbName}" does not end with "_test".`);
  process.exit(1);
}

const tag = `rmt${Date.now().toString(36)}`;
let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}
async function expectReject(fn: () => Promise<unknown>, match: RegExp, status?: number) {
  await assert.rejects(fn, (e: Error & { status?: number }) => {
    assert.match(e.message, match);
    if (status) assert.equal(e.status, status);
    return true;
  });
}

/** Fake Paymently verify-payment responses keyed by invoice id. */
const invoices = new Map<string, PaymentlyVerifyResult>();
const fakeVerify = async (invoiceId: string): Promise<PaymentlyVerifyResult> => {
  const r = invoices.get(invoiceId);
  if (!r) throw new Error('unknown invoice');
  return r;
};
function invoice(
  id: string,
  amount: number,
  metadata: Record<string, unknown>,
  status: PaymentlyVerifyResult['status'] = 'COMPLETED',
) {
  invoices.set(id, {
    status,
    amount,
    fee: 0,
    chargedAmount: amount,
    invoiceId: id,
    transactionId: `trx-${id}`,
    paymentMethod: 'bkash',
    metadata,
  });
}

const ADMIN_ID = new mongoose.Types.ObjectId().toString();
const address = {
  division: 'Dhaka',
  district: 'Dhaka',
  area: 'Badda',
  street: 'House 1, Road 2',
};

async function balance(id: string) {
  return (await ResellerModel.findById(id).lean())!.walletBalance;
}

async function main() {
  await connectDB();
  console.log(`Reseller money test on "${mongoose.connection.name}" (run ${tag})\n`);
  const created = { categories: [] as string[], products: [] as string[], resellers: [] as string[] };
  const settingsBefore = await SettingsModel.findOne({}, 'resellerWithdrawalFeeTiers').lean();
  const insideFee =
    (await SettingsModel.findOne({}, 'shippingFeeInsideDhaka').lean())?.shippingFeeInsideDhaka ?? 70;

  try {
    const supplier = await saveSupplier(
      supplierSchema.parse({ name: `${tag} Supplier`, websiteUrl: 'https://example.com' }),
    );
    const cat = await saveCategory(categorySchema.parse({ name: `${tag} Gadgets` }));
    created.categories.push(cat.id);
    const product = await saveProduct(
      productSchema.parse({
        name: `${tag} Earbuds`,
        category: cat.id,
        supplier: supplier.id,
        supplierPrice: 400,
        price: 900,
        resellerEnabled: true,
        resellerProfit: 100, // reseller price = 500
        resellerPackagingCost: 20,
      }),
    );
    created.products.push(product.id);

    const reseller = await ResellerModel.create({
      name: `${tag} Seller`,
      shopName: `${tag} Shop`,
      email: `${tag}@example.com`,
      isActive: true,
    });
    const rid = String(reseller._id);
    created.resellers.push(rid);
    const other = await ResellerModel.create({
      name: `${tag} Other`,
      shopName: `${tag} Other Shop`,
      email: `${tag}-o@example.com`,
      isActive: true,
    });
    created.resellers.push(String(other._id));

    // ── 1. Deposits ───────────────────────────────────────────────────────
    await step('deposit credits the GATEWAY amount for a verified invoice', async () => {
      invoice(`${tag}-inv1`, 1000, { type: 'wallet_deposit', resellerId: rid, amount: '1000' });
      const r = await creditResellerDepositFromInvoice(
        { invoiceId: `${tag}-inv1`, resellerId: rid },
        fakeVerify,
      );
      assert.equal(r.alreadyCredited, false);
      assert.equal(r.tx.amount, 1000);
      assert.equal(await balance(rid), 1000);
    });

    await step('the same invoice never credits twice (sequential + concurrent)', async () => {
      const again = await creditResellerDepositFromInvoice(
        { invoiceId: `${tag}-inv1`, resellerId: rid },
        fakeVerify,
      );
      assert.equal(again.alreadyCredited, true);
      invoice(`${tag}-inv2`, 200, { type: 'wallet_deposit', resellerId: rid, amount: 200 });
      const results = await Promise.allSettled([
        creditResellerDepositFromInvoice({ invoiceId: `${tag}-inv2`, resellerId: rid }, fakeVerify),
        creditResellerDepositFromInvoice({ invoiceId: `${tag}-inv2`, resellerId: rid }, fakeVerify),
        creditResellerDepositFromInvoice({ invoiceId: `${tag}-inv2` }, fakeVerify),
      ]);
      assert.ok(results.every((r) => r.status === 'fulfilled'), 'all calls succeed');
      assert.equal(await balance(rid), 1200, 'credited exactly once');
      assert.equal(
        await WalletTransactionModel.countDocuments({ invoiceId: `${tag}-inv2` }),
        1,
      );
    });

    await step('deposit rejects wrong owner / type / amount / unfinished payment', async () => {
      invoice(`${tag}-own`, 500, { type: 'wallet_deposit', resellerId: rid, amount: 500 });
      await expectReject(
        () =>
          creditResellerDepositFromInvoice(
            { invoiceId: `${tag}-own`, resellerId: String(other._id) },
            fakeVerify,
          ),
        /another account/,
        403,
      );
      invoice(`${tag}-ord`, 500, { type: 'order', resellerId: rid, amount: 500 });
      await expectReject(
        () => creditResellerDepositFromInvoice({ invoiceId: `${tag}-ord`, resellerId: rid }, fakeVerify),
        /not a wallet deposit/,
      );
      invoice(`${tag}-amt`, 500, { type: 'wallet_deposit', resellerId: rid, amount: 5000 });
      await expectReject(
        () => creditResellerDepositFromInvoice({ invoiceId: `${tag}-amt`, resellerId: rid }, fakeVerify),
        /does not match/,
      );
      invoice(`${tag}-pen`, 500, { type: 'wallet_deposit', resellerId: rid, amount: 500 }, 'PENDING');
      await expectReject(
        () => creditResellerDepositFromInvoice({ invoiceId: `${tag}-pen`, resellerId: rid }, fakeVerify),
        /pending/,
      );
      assert.equal(await balance(rid), 1200, 'nothing credited');
    });

    // ── 2/3. Orders ───────────────────────────────────────────────────────
    const line = (over: Record<string, unknown> = {}) => ({
      productId: product.id,
      quantity: 2,
      sellingPrice: 700,
      ...over,
    });
    const customer = { name: 'Test Customer', phone: '01700000000' };

    await step('rejects non-integer / out-of-range money and quantity', async () => {
      await expectReject(
        () => placeResellerOrder(rid, { customer, shippingAddress: address, items: [line({ sellingPrice: 700.5 })] }),
        /whole number/,
      );
      await expectReject(
        () => placeResellerOrder(rid, { customer, shippingAddress: address, items: [line({ quantity: 1.5 })] }),
        /whole number/,
      );
      await expectReject(
        () => placeResellerOrder(rid, { customer, shippingAddress: address, items: [line({ sellingPrice: 499 })] }),
        /cannot be lower/,
      );
      await expectReject(
        () => placeResellerOrder(rid, { customer, shippingAddress: address, items: [line({ sellingPrice: 2501 })] }),
        /cannot be higher/,
      );
    });

    await step('expectedResellerPrice mismatch → 409 with old and new price', async () => {
      await expectReject(
        () =>
          placeResellerOrder(rid, {
            customer,
            shippingAddress: address,
            items: [line({ expectedResellerPrice: 450 })],
          }),
        /changed from ৳450 to ৳500/,
        409,
      );
    });

    let orderId = '';
    await step('order snapshots prices; delivery + packaging computed server-side and debited', async () => {
      const before = await balance(rid);
      const o = await placeResellerOrder(rid, {
        customer,
        shippingAddress: address,
        items: [line({ expectedResellerPrice: 500 })],
      });
      orderId = String(o._id);
      const doc = (await OrderModel.findById(orderId).lean())!;
      const item = doc.items[0]!;
      assert.equal(item.resellerPrice, 500);
      assert.equal(item.supplierPrice, 400);
      assert.equal(item.platformMargin, 100);
      assert.equal(item.unitPrice, 700);
      const s = doc.resellerSummary!;
      assert.equal(s.resellerPriceTotal, 1000);
      assert.equal(s.resellerSellingTotal, 1400);
      assert.equal(s.deliveryCharge, insideFee, 'Dhaka → inside Dhaka fee from settings');
      assert.equal(s.packagingCost, 20);
      assert.equal(s.upfrontDeducted, insideFee + 20);
      assert.equal(s.expectedResellerProfit, 1400 - 1000 - 20);
      assert.equal(s.deliveryPaymentMode, 'with_product');
      assert.equal(s.codAmount, 1400 + insideFee);
      assert.equal(await balance(rid), before - (insideFee + 20));
    });

    await step('price change after ordering does NOT change the credited profit', async () => {
      await ProductModel.updateOne(
        { _id: product.id },
        { $set: { supplierPrice: 600, resellerProfit: 300, resellerPackagingCost: 50 } },
      );
      const before = await balance(rid);
      await updateOrderStatus(orderId, 'delivered', ADMIN_ID);
      const doc = (await OrderModel.findById(orderId).lean())!;
      assert.equal(doc.resellerSummary!.profitCredited, true);
      assert.equal(doc.resellerSummary!.profitCreditedAmount, 380, 'old price: 1400-1000-20');
      assert.equal(await balance(rid), before + 380);
      await ProductModel.updateOne(
        { _id: product.id },
        { $set: { supplierPrice: 400, resellerProfit: 100, resellerPackagingCost: 20 } },
      );
    });

    await step('profit is credited exactly once, even when settled again concurrently', async () => {
      const before = await balance(rid);
      const stale = (await OrderModel.findById(orderId))!;
      stale.resellerSummary!.profitCredited = false; // simulate a stale in-memory copy
      await Promise.all([
        settleResellerOrderOnStatusChange(stale, 'delivered', 'shipped'),
        settleResellerOrderOnStatusChange(stale, 'delivered', 'shipped'),
      ]);
      assert.equal(await balance(rid), before);
      assert.equal(
        await WalletTransactionModel.countDocuments({ order: orderId, type: 'order_profit' }),
        1,
      );
    });

    await step('advance delivery: COD excludes delivery; COD shortfall comes out of profit', async () => {
      const o = await placeResellerOrder(rid, {
        customer,
        shippingAddress: address,
        items: [line({ quantity: 1 })],
        deliveryPaymentMode: 'advance',
      });
      const s = (await OrderModel.findById(o._id).lean())!.resellerSummary!;
      assert.equal(s.codAmount, 700, 'courier collects only the selling total');
      const before = await balance(rid);
      await updateOrderStatus(String(o._id), 'delivered', ADMIN_ID, undefined, {
        codCollected: 650,
      });
      const after = (await OrderModel.findById(o._id).lean())!.resellerSummary!;
      assert.equal(after.codCollected, 650);
      // expected 700-500-20 = 180, minus 50 shortfall
      assert.equal(after.profitCreditedAmount, 130);
      assert.equal(await balance(rid), before + 130);
    });

    await step('cancel refunds the upfront charge exactly once', async () => {
      const o = await placeResellerOrder(rid, {
        customer,
        shippingAddress: address,
        items: [line({ quantity: 1 })],
      });
      const afterOrder = await balance(rid);
      await cancelResellerOrder(rid, String(o._id), 'test');
      assert.equal(await balance(rid), afterOrder + insideFee + 20);
      const stale = (await OrderModel.findById(o._id))!;
      stale.resellerSummary!.upfrontRefunded = false;
      await settleResellerOrderOnStatusChange(stale, 'cancelled', 'pending');
      assert.equal(await balance(rid), afterOrder + insideFee + 20, 'no second refund');
    });

    await step('order is refused when the wallet cannot cover the upfront charge', async () => {
      const poor = await ResellerModel.create({
        name: `${tag} Poor`,
        shopName: `${tag} Poor Shop`,
        email: `${tag}-p@example.com`,
        isActive: true,
        walletBalance: 50,
      });
      created.resellers.push(String(poor._id));
      await expectReject(
        () => placeResellerOrder(String(poor._id), { customer, shippingAddress: address, items: [line()] }),
        /Insufficient wallet balance/,
      );
      assert.equal((await ResellerModel.findById(poor._id).lean())!.walletBalance, 50);
    });

    // ── 4. Withdrawals ────────────────────────────────────────────────────
    await step('withdrawal fee comes from settings; fee >= amount is refused', async () => {
      await SettingsModel.updateOne(
        { key: 'store' },
        { $set: { resellerWithdrawalFeeTiers: [{ minAmount: 0, fee: 10 }, { minAmount: 1000, fee: 20 }] } },
        { upsert: true },
      );
      const { tx } = await requestResellerWithdrawal({
        resellerId: rid,
        amount: 100,
        payoutMethod: 'bkash',
        payoutAccount: '01700000000',
      });
      assert.equal(tx.fee, 10);
      assert.equal(tx.netAmount, 90);
      await SettingsModel.updateOne(
        { key: 'store' },
        { $set: { resellerWithdrawalFeeTiers: [{ minAmount: 0, fee: 60 }] } },
      );
      await expectReject(
        () =>
          requestResellerWithdrawal({
            resellerId: rid,
            amount: 60,
            payoutMethod: 'bkash',
            payoutAccount: '01700000000',
          }),
        /not less than/,
      );
      await SettingsModel.updateOne(
        { key: 'store' },
        { $set: { resellerWithdrawalFeeTiers: [] } },
      );
    });

    await step('rejecting a withdrawal refunds exactly once', async () => {
      const before = await balance(rid);
      const { tx } = await requestResellerWithdrawal({
        resellerId: rid,
        amount: 200,
        payoutMethod: 'bkash',
        payoutAccount: '01700000000',
      });
      assert.equal(await balance(rid), before - 200, 'amount is held');
      const results = await Promise.allSettled([
        processResellerWithdrawal(String(tx._id), 'reject', ADMIN_ID),
        processResellerWithdrawal(String(tx._id), 'reject', ADMIN_ID),
        processResellerWithdrawal(String(tx._id), 'approve', ADMIN_ID),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      const final = (await WalletTransactionModel.findById(tx._id).lean())!.status;
      const expected = final === 'rejected' ? before : before - 200;
      assert.equal(await balance(rid), expected, 'refunded at most once');
    });

    await step('cannot withdraw more than the balance', async () => {
      await expectReject(
        () =>
          requestResellerWithdrawal({
            resellerId: rid,
            amount: 10_000_000,
            payoutMethod: 'bkash',
            payoutAccount: '01700000000',
          }),
        /Insufficient wallet balance/,
      );
    });

    // ── 6. Tokens ─────────────────────────────────────────────────────────
    await step('logout / suspension revokes existing tokens', async () => {
      const fresh = (await ResellerModel.findById(rid))!;
      const token = await signResellerToken(fresh);
      const payload = (await verifyResellerToken(token))!;
      assert.equal(payload.ver, fresh.tokenVersion ?? 0);
      await revokeResellerTokens(rid);
      const bumped = (await ResellerModel.findById(rid).lean())!;
      assert.notEqual(payload.ver, bumped.tokenVersion, 'old token version is now stale');
    });
  } finally {
    const resellerIds = created.resellers;
    await Promise.all([
      OrderModel.deleteMany({ reseller: { $in: resellerIds } }),
      WalletTransactionModel.deleteMany({ reseller: { $in: resellerIds } }),
      ResellerModel.deleteMany({ _id: { $in: resellerIds } }),
      ProductModel.deleteMany({ _id: { $in: created.products } }),
      CategoryModel.deleteMany({ _id: { $in: created.categories } }),
      SupplierModel.deleteMany({ name: new RegExp(`^${tag}`) }),
      SettingsModel.updateOne(
        { key: 'store' },
        { $set: { resellerWithdrawalFeeTiers: settingsBefore?.resellerWithdrawalFeeTiers ?? [] } },
      ),
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
