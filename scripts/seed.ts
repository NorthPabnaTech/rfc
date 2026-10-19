/**
 * Idempotent bootstrap: `npm run seed`
 *
 *  - creates the first admin from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD
 *  - registers the current suppliers (ShopBase BD, Merrono)
 *  - creates the store settings singleton
 *  - adds a starter category tree if there are no categories yet
 *
 * Safe to run repeatedly — existing records are left untouched.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { CategoryModel } from '../src/database/models/category';
import { SettingsModel } from '../src/database/models/settings';
import { SupplierModel } from '../src/database/models/supplier';
import { UserModel } from '../src/database/models/user';
import { slugify } from '../src/lib/slug';

const SUPPLIERS = [
  { name: 'ShopBase BD', websiteUrl: 'https://shopbasebd.com' },
  { name: 'Merrono', websiteUrl: 'https://merrono.com' },
];

const STARTER_CATEGORIES: Record<string, string[]> = {
  'Men’s Fashion': ['T-Shirts & Polos', 'Shirts', 'Pants & Jeans', 'Panjabi'],
  'Women’s Fashion': ['Three-Piece', 'Kurti & Tops', 'Saree', 'Hijab & Abaya'],
  'Bags & Accessories': ['Handbags', 'Wallets', 'Backpacks', 'Belts'],
  Watches: ['Men’s Watches', 'Women’s Watches', 'Smart Watches'],
  'Gadgets & Electronics': [
    'Earbuds & Headphones',
    'Chargers & Cables',
    'Mobile Accessories',
    'Smart Gadgets',
  ],
  'Home & Kitchen': ['Kitchen Tools', 'Home Decor', 'Storage & Organizers'],
  'Beauty & Personal Care': ['Skin Care', 'Hair Care', 'Grooming'],
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see .env.example)`);
  return v;
}

async function main() {
  await mongoose.connect(required('MONGODB_URI'), { dbName: process.env.MONGODB_DB || 'rfc_gadget' });
  console.log(`Connected to database "${mongoose.connection.name}"`);

  // Make sure unique indexes exist before inserting.
  await Promise.all(
    [UserModel, SupplierModel, CategoryModel, SettingsModel].map((m) => m.syncIndexes()),
  );

  const email = required('ADMIN_EMAIL').toLowerCase();
  if (await UserModel.exists({ email })) {
    console.log(`• Admin ${email} already exists`);
  } else {
    const password = required('ADMIN_PASSWORD');
    if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
    await UserModel.create({
      name: process.env.ADMIN_NAME || 'RFC Gadget Admin',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'admin',
    });
    console.log(`✓ Created admin ${email}`);
  }

  for (const s of SUPPLIERS) {
    const slug = slugify(s.name);
    const res = await SupplierModel.updateOne(
      { slug },
      { $setOnInsert: { ...s, slug, status: 'active' } },
      { upsert: true },
    );
    console.log(res.upsertedCount ? `✓ Added supplier ${s.name}` : `• Supplier ${s.name} exists`);
  }

  await SettingsModel.updateOne(
    { key: 'store' },
    { $setOnInsert: { key: 'store' } },
    { upsert: true },
  );
  console.log('✓ Store settings ready');

  if (
    process.argv.includes('--no-categories') ||
    (await CategoryModel.estimatedDocumentCount()) > 0
  ) {
    console.log('• Skipping starter categories');
  } else {
    let order = 0;
    for (const [parentName, children] of Object.entries(STARTER_CATEGORIES)) {
      const parent = await CategoryModel.create({
        name: parentName,
        slug: slugify(parentName),
        sortOrder: order++,
        isFeatured: true,
      });
      await CategoryModel.insertMany(
        children.map((name, i) => ({
          name,
          slug: slugify(`${parentName}-${name}`),
          parent: parent._id,
          sortOrder: i,
        })),
      );
    }
    console.log(`✓ Added ${Object.keys(STARTER_CATEGORIES).length} starter categories`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
