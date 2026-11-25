/**
 * Seeds the reseller platform database (MONGODB_DB, default `gadget_resell`).
 *
 *   npm run seed:reseller              admin + settings + categories (idempotent)
 *   npm run seed:reseller -- --catalog also the sample suppliers and products
 *
 * The admin comes from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD. An existing
 * admin is never overwritten (re-running is safe). Nothing is ever deleted.
 */
import mongoose from 'mongoose';

import { hashPassword } from '@lib/auth/password';
import { serverEnv } from '@lib/env';

import { CATEGORIES, PRODUCTS, SUPPLIERS } from '@/mock/catalog';
import { DEFAULT_SETTINGS } from '@/mock/settings';
import { connectDB } from '@/server/db';
import { CategoryModel, ProductModel, SettingsModel, SupplierModel, UserModel } from '@/server/models';

const withCatalog = process.argv.includes('--catalog');

async function main() {
  if (/rfc_gadget|novelo/i.test(serverEnv.MONGODB_DB)) {
    throw new Error(`Refusing to seed "${serverEnv.MONGODB_DB}" — that is another store's database.`);
  }
  await connectDB();
  console.log(`[seed] database: ${serverEnv.MONGODB_DB}`);

  // Settings (only missing fields are filled; admin edits are kept).
  const existing = await SettingsModel.findById('platform').lean();
  if (!existing) {
    await SettingsModel.create({ _id: 'platform', ...DEFAULT_SETTINGS });
    console.log('[seed] settings created');
  } else console.log('[seed] settings already exist — kept');

  // Super Admin
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local');
  if (password.length < 8) console.warn('[seed] WARNING: ADMIN_PASSWORD is shorter than 8 characters — change it after signing in.');
  const admin = await UserModel.findOne({ email }).lean();
  if (admin) {
    console.log(`[seed] admin ${email} already exists — kept (password unchanged)`);
  } else {
    await UserModel.create({
      role: 'admin',
      name: process.env.ADMIN_NAME?.trim() || 'Super Admin',
      email,
      passwordHash: await hashPassword(password),
      status: 'active',
      emailVerified: true,
    });
    console.log(`[seed] admin ${email} created`);
  }

  // Categories (matched by slug)
  const catIds = new Map<string, unknown>();
  for (const [i, c] of CATEGORIES.entries()) {
    const doc = await CategoryModel.findOneAndUpdate(
      { slug: c.slug },
      { $setOnInsert: { name: c.name, nameBn: c.nameBn, slug: c.slug, icon: c.icon, description: c.description, sort: i } },
      { upsert: true, new: true },
    ).lean();
    catIds.set(c.id, doc!._id);
  }
  console.log(`[seed] ${CATEGORIES.length} categories ensured`);

  if (withCatalog) {
    const supIds = new Map<string, unknown>();
    for (const s of SUPPLIERS) {
      const doc = await SupplierModel.findOneAndUpdate(
        { name: s.name },
        { $setOnInsert: { name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email, sourceUrl: s.sourceUrl, status: s.status, notes: s.notes } },
        { upsert: true, new: true },
      ).lean();
      supIds.set(s.id, doc!._id);
    }
    let created = 0;
    for (const p of PRODUCTS) {
      const res = await ProductModel.updateOne(
        { slug: p.slug },
        {
          $setOnInsert: {
            name: p.name,
            nameBn: p.nameBn,
            slug: p.slug,
            description: p.description,
            images: p.images,
            categoryId: catIds.get(p.categoryId),
            supplierId: supIds.get(p.supplierId),
            supplierCost: p.supplierCost,
            platformMargin: p.platformMargin,
            deliveryCharge: p.deliveryCharge,
            packagingCharge: p.packagingCharge,
            suggestedPrice: p.suggestedPrice,
            status: p.status,
            availability: p.availability,
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount) created++;
    }
    console.log(`[seed] ${SUPPLIERS.length} suppliers ensured, ${created} new products (${PRODUCTS.length - created} already existed)`);
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error('[seed] failed:', error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exit(1);
  });
