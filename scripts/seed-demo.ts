/**
 * Development demo data — makes the store look and behave like a real shop.
 *
 *   npm run seed:demo              # fill an EMPTY database
 *   npm run seed:demo -- --reset   # wipe all store data, then recreate it
 *
 * Creates: admin + demo customers, suppliers, categories, tags, 29 products
 * (with Cloudinary images in RFC-Gadget/products/seed/), combo offers, banners
 * (RFC-Gadget/banners/), orders in every status across platforms, reviews,
 * product Q&A and return requests.
 *
 * Images get deterministic Cloudinary ids, so re-running reuses them instead
 * of uploading again. `--reset` refuses to run when NODE_ENV=production.
 *
 * Demo logins:
 *   admin@rfcgadget.com     / RfcGadget@12345    (admin)
 *   customer@rfcgadget.com  / Customer@12345  (customer)
 */
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';

import type { ImageAsset } from '@/database';
import {
  AddressModel,
  BannerModel,
  CategoryModel,
  connectDB,
  nextSequence,
  OrderModel,
  ProductModel,
  QuestionModel,
  ReturnRequestModel,
  ReviewModel,
  SettingsModel,
  SupplierModel,
  TagModel,
  UserModel,
} from '@/database';
import { CounterModel } from '@/database/models/counter';
import { saveBanner } from '@/services/banners';
import { saveCategory, saveSupplier, saveTag } from '@/services/catalog';
import { saveCombo } from '@/services/combos';
import { saveProduct } from '@/services/products';
import type { OrderPlatform, OrderStatus, ShippingZone } from '@lib/constants';
import { type BannerOutput, bannerSchema } from '@lib/validators/banner';
import {
  categorySchema,
  comboSchema,
  productSchema,
  supplierSchema,
  tagSchema,
} from '@lib/validators/catalog';

const RESET = process.argv.includes('--reset');
const DAY = 86_400_000;
const daysAgo = (d: number, hour = 11) => {
  const t = new Date(Date.now() - d * DAY);
  t.setHours(hour, (d * 37) % 60, 0, 0);
  return t;
};

/* ─── Images ────────────────────────────────────────────────────────────── */

// Unsplash photo ids, each checked by eye to show the product it's used for.
const PHOTO = {
  headphonesYellow: '1505740420928-5e560c06d30e',
  watchWhite: '1523275335684-37898b6baf30',
  appleWatch: '1546868871-7041f2a55e12',
  earbudsRed: '1606220588913-b3aacb4d2f46',
  earbudsPixel: '1590658268037-6bf12165a8df',
  airpodsPro: '1572569511254-d8f925fe2cbb',
  headphonesWhite: '1583394838336-acd977736f90',
  teeWhiteMan: '1521572163474-6864f9cf17ab',
  teeWhiteBeard: '1586790170083-2f9ceadc732d',
  teeGraphic: '1576566588028-4147f3842f27',
  teeBlackHanger: '1618354691373-d851c5c3a990',
  teeBlackMan: '1503341504253-dff4815485f1',
  deskLamp: '1507473885765-e6ed057f782c',
  skincareTube: '1556228578-8c89e6adf883',
  perfume: '1585386959984-a4155224a1ad',
  skincareBottles: '1611930022073-b7a4ba5fcccd',
  airpodsMax: '1609081219090-a6d81d3085bf',
  keyboard: '1625948515291-69613efd103f',
  perfumeRoses: '1594035910387-fea47794261f',
  mouseGrey: '1527864550417-7fd91fc51a46',
  watchLeather: '1585123334904-845d60e97b29',
  sunscreen: '1615397349754-cfa2066a298e',
  poloMan: '1625910513520-bed0389ce32f',
  shirtWhite: '1598033129183-c4f50c736f10',
  teeWhiteHanger: '1581655353564-df123a1eb820',
  teeBlackHanger2: '1583743814966-8936f5b7be1a',
  teeBlackMan2: '1618517351616-38fb9c5210c6',
  watchBlue: '1619134778706-7015533a6150',
  magCharger: '1615526675159-e248c3021d3f',
  blender: '1585515320310-259814833e62',
  ceramicCups: '1610701596007-11502861dcfa',
  hairDryer: '1621607512214-68297480165e',
  creamTube: '1608248597279-f99d160bfcbc',
  makeup: '1522335789203-aabd1fc54bc9',
  serumBottles: '1631729371254-42c2892f0e6e',
  serumDropper: '1608571423902-eed4a5ad8108',
  controller: '1600080972464-8e5f35f63d08',
  laptopDesk: '1601524909162-ae8725290836',
  pendantLamp: '1513506003901-1e6a229e2d15',
  mugWhite: '1514228742587-6b1558fcca3d',
  mugCamp: '1572119865084-43c285814d63',
  bottleGreen: '1602143407151-7111542de6e8',
  watchWhiteFace: '1593998066526-65fcab3021a2',
  makeupBrushes: '1596462502278-27bfdc403348',
  watchFossil: '1622434641406-a158123450f9',
  mouseWhite: '1527814050087-3793815479db',
  tablet: '1544244015-0df4b3ffc6b0',
  chargerBrick: '1583863788434-e58a36330cf0',
  headphonesBrown: '1585771724684-38269d6639fd',
  essentialOils: '1608042314453-ae338d80c427',
  cleanser: '1620916566398-39f1143ab7be',
  laptopCamera: '1612817288484-6f916006741a',
  airpodsWhite: '1600294037681-c80b4cb5b434',
  smartwatchBlack: '1617043786394-f977fa12eddf',
  airpodsPink: '1585565804112-f201f68c48b4',
  kitchen: '1556911220-bff31c812dba',
  kitchenIsland: '1600585152220-90363fe7e115',
  tabletCase: '1628815113969-0487917fc6a1',
  bpMonitor: '1615486511484-92e172cc4fe0',
  kettle: '1594213114663-d94db9b17125',
  jar: '1622428051717-dcd8412959de',
  livingRoom: '1616046229478-9901c5536a45',
} as const;
type PhotoKey = keyof typeof PHOTO;

const uploaded = new Map<string, ImageAsset>();

/** Upload an Unsplash photo to Cloudinary once (deterministic public id). */
async function cloudImage(
  key: PhotoKey,
  publicId: string,
  size: { w: number; h: number },
): Promise<ImageAsset> {
  const cached = uploaded.get(publicId);
  if (cached) return cached;
  const src = `https://images.unsplash.com/photo-${PHOTO[key]}?w=${size.w}&h=${size.h}&fit=crop&q=80&fm=jpg`;
  const r = await cloudinary.uploader.upload(src, {
    public_id: publicId,
    overwrite: false,
    resource_type: 'image',
  });
  const asset: ImageAsset = {
    type: 'cloudinary',
    url: r.secure_url,
    publicId: r.public_id,
    width: r.width,
    height: r.height,
  };
  uploaded.set(publicId, asset);
  return asset;
}

const productImage = (key: PhotoKey, slug: string, n: number) =>
  cloudImage(key, `RFC-Gadget/products/seed/${slug}-${n}`, { w: 1200, h: 1200 });

/* ─── Catalog definition ────────────────────────────────────────────────── */

const CATEGORIES: { name: string; image: PhotoKey; children: [string, PhotoKey][] }[] = [
  {
    name: 'Electronics',
    image: 'airpodsMax',
    children: [
      ['Mobile Accessories', 'chargerBrick'],
      ['Smart Gadgets', 'appleWatch'],
      ['Computer Accessories', 'keyboard'],
    ],
  },
  {
    name: 'Fashion',
    image: 'teeWhiteMan',
    children: [
      ['T-Shirt', 'teeWhiteHanger'],
      ['Polo Shirt', 'poloMan'],
      ['Watches', 'watchLeather'],
    ],
  },
  {
    name: 'Home & Living',
    image: 'livingRoom',
    children: [
      ['Kitchen Items', 'kitchenIsland'],
      ['Home Accessories', 'deskLamp'],
    ],
  },
  {
    name: 'Beauty & Personal Care',
    image: 'makeupBrushes',
    children: [
      ['Grooming', 'hairDryer'],
      ['Skincare', 'skincareBottles'],
    ],
  },
];

const TAGS = [
  'Best Seller',
  'New Arrival',
  'Wireless',
  'Cotton',
  'Gift Idea',
  'Trending',
  'Eco Friendly',
];

type SeedProduct = {
  name: string;
  sub: string;
  supplier: 0 | 1;
  cost: number;
  price: number;
  sale?: number;
  photos: PhotoKey[];
  tags: string[];
  short: string;
  bullets: string[];
  specs: [string, string][];
  variations?: { name: string; values: string[] }[];
  stock?: 'in_stock' | 'out_of_stock' | 'pre_order';
  featured?: boolean;
};

const PRODUCTS: SeedProduct[] = [
  // Electronics → Mobile Accessories
  {
    name: 'Wireless Bluetooth Earbuds',
    sub: 'Mobile Accessories',
    supplier: 0,
    cost: 820,
    price: 1590,
    sale: 1290,
    photos: ['earbudsRed', 'earbudsPixel', 'airpodsWhite'],
    tags: ['Best Seller', 'Wireless', 'Trending'],
    featured: true,
    short:
      'True wireless earbuds with deep bass, touch controls and up to 24 hours of battery with the case.',
    bullets: [
      'Bluetooth 5.3 with instant pairing',
      'Touch controls for music and calls',
      'IPX5 sweat and splash resistant',
      '6 h playtime + 18 h with the charging case',
    ],
    specs: [
      ['Bluetooth', '5.3'],
      ['Battery', '6 h (24 h with case)'],
      ['Charging', 'USB-C'],
      ['Water resistance', 'IPX5'],
      ['Warranty', '6 months'],
    ],
  },
  {
    name: 'Fast Charging Adapter 20W',
    sub: 'Mobile Accessories',
    supplier: 1,
    cost: 360,
    price: 890,
    sale: 690,
    photos: ['chargerBrick', 'magCharger'],
    tags: ['Best Seller'],
    featured: true,
    short:
      '20W USB-C power delivery charger — charges compatible phones to 50% in about 30 minutes.',
    bullets: [
      '20W USB-C Power Delivery',
      'Over-heat and over-current protection',
      'Compact, travel-friendly design',
    ],
    specs: [
      ['Output', '20W USB-C PD'],
      ['Input', '100–240V'],
      ['Plug', '2-pin'],
      ['Warranty', '6 months'],
    ],
  },
  {
    name: 'Magnetic Charging Cable',
    sub: 'Mobile Accessories',
    supplier: 1,
    cost: 160,
    price: 420,
    photos: ['magCharger', 'chargerBrick'],
    tags: ['New Arrival'],
    short: 'Braided 1 m USB-C cable with a magnetic tip — tangle-free and built to last.',
    bullets: [
      'Nylon-braided for durability',
      'Supports fast charging up to 60W',
      'Data transfer up to 480 Mbps',
    ],
    specs: [
      ['Length', '1 m'],
      ['Connector', 'USB-C to USB-C'],
      ['Max power', '60W'],
    ],
  },
  {
    name: 'Noise Cancelling Earbuds Pro',
    sub: 'Mobile Accessories',
    supplier: 0,
    cost: 1350,
    price: 2690,
    sale: 2290,
    photos: ['airpodsPro', 'airpodsPink', 'airpodsWhite'],
    tags: ['Wireless', 'New Arrival'],
    short:
      'Active noise cancellation, transparency mode and crystal-clear calls in a pocket-sized case.',
    bullets: ['Active noise cancellation', 'Transparency mode', 'Wireless charging case'],
    specs: [
      ['ANC', 'Up to 35 dB'],
      ['Battery', '5 h (20 h with case)'],
      ['Bluetooth', '5.3'],
    ],
  },
  {
    name: 'Wireless Over-Ear Headphones',
    sub: 'Mobile Accessories',
    supplier: 0,
    cost: 1200,
    price: 2490,
    sale: 1990,
    photos: ['headphonesYellow', 'headphonesWhite', 'headphonesBrown'],
    tags: ['Wireless', 'Gift Idea'],
    variations: [{ name: 'Color', values: ['Black', 'White'] }],
    short: 'Soft over-ear cushions, rich sound and 40 hours of wireless playback.',
    bullets: ['40 h battery life', 'Foldable design with carry pouch', 'Built-in mic for calls'],
    specs: [
      ['Battery', '40 h'],
      ['Driver', '40 mm'],
      ['Connectivity', 'Bluetooth 5.2 + 3.5 mm'],
    ],
  },
  // Electronics → Smart Gadgets
  {
    name: 'Smart Watch Series 9',
    sub: 'Smart Gadgets',
    supplier: 0,
    cost: 1250,
    price: 2490,
    sale: 1990,
    photos: ['appleWatch', 'smartwatchBlack', 'watchWhite'],
    tags: ['Best Seller', 'Trending', 'Gift Idea'],
    featured: true,
    short: '1.9" display, heart-rate & SpO2 tracking, 100+ sport modes and Bluetooth calling.',
    bullets: [
      'Bluetooth calling from your wrist',
      'Heart rate, SpO2 and sleep tracking',
      '100+ sport modes',
      'Up to 7 days battery',
    ],
    specs: [
      ['Display', '1.9" HD'],
      ['Battery', 'Up to 7 days'],
      ['Water resistance', 'IP67'],
      ['Compatibility', 'Android & iOS'],
    ],
  },
  {
    name: 'Digital Blood Pressure Monitor',
    sub: 'Smart Gadgets',
    supplier: 1,
    cost: 1400,
    price: 2850,
    sale: 2450,
    photos: ['bpMonitor'],
    tags: ['Gift Idea'],
    short:
      'Accurate one-touch upper-arm blood pressure readings with a large, easy-to-read display.',
    bullets: ['One-touch measurement', 'Irregular heartbeat detection', 'Stores 2 × 60 readings'],
    specs: [
      ['Cuff', '22–36 cm'],
      ['Power', '4 × AA or USB'],
      ['Memory', '120 readings'],
    ],
  },
  {
    name: 'Wireless Game Controller',
    sub: 'Smart Gadgets',
    supplier: 0,
    cost: 1100,
    price: 2190,
    photos: ['controller'],
    tags: ['Wireless', 'Gift Idea'],
    stock: 'out_of_stock',
    short: 'Ergonomic Bluetooth controller for PC, Android and TV boxes.',
    bullets: ['Low-latency Bluetooth', 'Dual vibration motors', 'Rechargeable battery'],
    specs: [
      ['Connectivity', 'Bluetooth / USB-C'],
      ['Battery', 'Up to 20 h'],
    ],
  },
  // Electronics → Computer Accessories
  {
    name: 'Mechanical Keyboard',
    sub: 'Computer Accessories',
    supplier: 0,
    cost: 1600,
    price: 3490,
    sale: 2990,
    photos: ['keyboard', 'laptopDesk'],
    tags: ['Trending'],
    short: 'Compact 75% mechanical keyboard with tactile switches and soft white backlight.',
    bullets: ['Hot-swappable tactile switches', 'USB-C detachable cable', 'PBT keycaps'],
    specs: [
      ['Layout', '75%'],
      ['Switches', 'Tactile'],
      ['Connection', 'USB-C wired'],
    ],
  },
  {
    name: 'Wireless Mouse',
    sub: 'Computer Accessories',
    supplier: 1,
    cost: 280,
    price: 790,
    sale: 650,
    photos: ['mouseWhite', 'mouseGrey'],
    tags: ['Wireless'],
    short: 'Silent-click wireless mouse with a comfortable shape and 12-month battery life.',
    bullets: ['Silent clicks', '2.4 GHz nano receiver', 'Adjustable DPI up to 1600'],
    specs: [
      ['DPI', '800 / 1200 / 1600'],
      ['Battery', '1 × AA (12 months)'],
    ],
  },
  {
    name: 'Tablet Protective Case',
    sub: 'Computer Accessories',
    supplier: 1,
    cost: 250,
    price: 690,
    photos: ['tabletCase', 'tablet'],
    tags: ['New Arrival'],
    short: 'Slim folio case with auto sleep/wake and a stand for watching and typing.',
    bullets: ['Auto sleep / wake', 'Two stand angles', 'Shock-absorbing corners'],
    specs: [
      ['Fits', '10.9" – 11" tablets'],
      ['Material', 'PU leather + TPU'],
    ],
  },
  // Fashion → T-Shirt
  {
    name: 'Premium Cotton T-Shirt',
    sub: 'T-Shirt',
    supplier: 1,
    cost: 230,
    price: 650,
    sale: 499,
    photos: ['teeWhiteMan', 'teeWhiteHanger', 'teeWhiteBeard'],
    tags: ['Best Seller', 'Cotton'],
    featured: true,
    variations: [{ name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'] }],
    short: '100% combed cotton, 180 GSM — soft, breathable and shape-retaining after every wash.',
    bullets: ['100% combed cotton, 180 GSM', 'Pre-shrunk fabric', 'Reinforced neck rib'],
    specs: [
      ['Fabric', '100% cotton'],
      ['GSM', '180'],
      ['Fit', 'Regular'],
    ],
  },
  {
    name: 'Graphic Print T-Shirt',
    sub: 'T-Shirt',
    supplier: 1,
    cost: 260,
    price: 750,
    sale: 590,
    photos: ['teeGraphic', 'teeBlackHanger2'],
    tags: ['Cotton', 'Trending'],
    variations: [{ name: 'Size', values: ['M', 'L', 'XL'] }],
    short: 'Bold street-style print on a soft cotton tee.',
    bullets: ['High-density print that lasts', 'Soft cotton jersey'],
    specs: [
      ['Fabric', '100% cotton'],
      ['Fit', 'Relaxed'],
    ],
  },
  {
    name: 'Classic Black T-Shirt',
    sub: 'T-Shirt',
    supplier: 1,
    cost: 220,
    price: 600,
    photos: ['teeBlackMan', 'teeBlackHanger', 'teeBlackMan2'],
    tags: ['Cotton'],
    variations: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }],
    short: 'The everyday essential — a clean, deep-black crew-neck tee.',
    bullets: ['Colour-fast black dye', 'Crew neck'],
    specs: [
      ['Fabric', '100% cotton'],
      ['GSM', '170'],
    ],
  },
  // Fashion → Polo Shirt
  {
    name: 'Casual Polo Shirt',
    sub: 'Polo Shirt',
    supplier: 1,
    cost: 330,
    price: 850,
    sale: 699,
    photos: ['poloMan', 'shirtWhite'],
    tags: ['Best Seller', 'Cotton'],
    featured: true,
    variations: [
      { name: 'Size', values: ['M', 'L', 'XL', 'XXL'] },
      { name: 'Color', values: ['Black', 'White', 'Navy'] },
    ],
    short: 'Pique cotton polo with a smart collar — office-ready, weekend-easy.',
    bullets: ['Breathable pique cotton', 'Two-button placket', 'Ribbed collar and cuffs'],
    specs: [
      ['Fabric', 'Cotton pique'],
      ['Fit', 'Regular'],
    ],
  },
  // Fashion → Watches
  {
    name: 'Classic Leather Strap Watch',
    sub: 'Watches',
    supplier: 0,
    cost: 1450,
    price: 3200,
    sale: 2750,
    photos: ['watchLeather', 'watchWhiteFace'],
    tags: ['Gift Idea'],
    short: 'Minimal white dial with a genuine leather strap — a gift that always works.',
    bullets: ['Japanese quartz movement', 'Genuine leather strap', '3 ATM water resistant'],
    specs: [
      ['Case', '40 mm stainless steel'],
      ['Movement', 'Quartz'],
      ['Water resistance', '3 ATM'],
    ],
  },
  {
    name: 'Chronograph Steel Watch',
    sub: 'Watches',
    supplier: 0,
    cost: 2100,
    price: 4500,
    sale: 3890,
    photos: ['watchFossil', 'watchBlue'],
    tags: ['New Arrival', 'Gift Idea'],
    stock: 'pre_order',
    short: 'Bold chronograph with stopwatch sub-dials and a solid steel bracelet.',
    bullets: ['Working chronograph', 'Luminous hands', '5 ATM water resistant'],
    specs: [
      ['Case', '44 mm'],
      ['Movement', 'Quartz chronograph'],
    ],
  },
  // Home & Living → Kitchen Items
  {
    name: 'Portable Blender',
    sub: 'Kitchen Items',
    supplier: 1,
    cost: 760,
    price: 1890,
    sale: 1590,
    photos: ['blender', 'kitchen'],
    tags: ['Trending', 'New Arrival'],
    featured: true,
    short: 'USB-rechargeable personal blender — fresh smoothies and shakes anywhere.',
    bullets: [
      '6 stainless steel blades',
      'USB-C rechargeable, 15 blends per charge',
      'BPA-free 400 ml jar',
    ],
    specs: [
      ['Capacity', '400 ml'],
      ['Battery', '2000 mAh'],
      ['Charging', 'USB-C'],
    ],
  },
  {
    name: 'Kitchen Organizer Jar Set',
    sub: 'Kitchen Items',
    supplier: 1,
    cost: 420,
    price: 1250,
    sale: 990,
    photos: ['jar', 'kitchenIsland'],
    tags: ['Eco Friendly'],
    short: 'Set of 6 airtight glass jars to keep spices, grains and snacks fresh and organised.',
    bullets: ['Food-grade glass', 'Airtight screw lids', 'Dishwasher safe'],
    specs: [
      ['Pieces', '6'],
      ['Capacity', '500 ml each'],
    ],
  },
  {
    name: 'Stainless Steel Kettle',
    sub: 'Kitchen Items',
    supplier: 1,
    cost: 600,
    price: 1450,
    photos: ['kettle', 'kitchen'],
    tags: ['Eco Friendly'],
    short: 'Classic stovetop kettle in food-grade stainless steel with a cool-touch handle.',
    bullets: ['Food-grade stainless steel', 'Works on gas and induction'],
    specs: [
      ['Capacity', '2 L'],
      ['Material', 'Stainless steel'],
    ],
  },
  {
    name: 'Ceramic Mug Set',
    sub: 'Kitchen Items',
    supplier: 1,
    cost: 380,
    price: 990,
    sale: 850,
    photos: ['ceramicCups', 'mugWhite', 'mugCamp'],
    tags: ['Gift Idea'],
    short: 'Set of 4 hand-glazed ceramic mugs for coffee and tea.',
    bullets: ['Microwave and dishwasher safe', 'Lead-free glaze'],
    specs: [
      ['Pieces', '4'],
      ['Capacity', '350 ml each'],
    ],
  },
  // Home & Living → Home Accessories
  {
    name: 'Rechargeable LED Lamp',
    sub: 'Home Accessories',
    supplier: 0,
    cost: 560,
    price: 1690,
    sale: 1390,
    photos: ['deskLamp', 'pendantLamp'],
    tags: ['Best Seller', 'Eco Friendly'],
    featured: true,
    short: 'Cordless LED desk lamp with 3 colour temperatures — perfect during load-shedding.',
    bullets: [
      '3 colour modes, stepless dimming',
      'Up to 10 h on one charge',
      'Eye-care flicker-free LEDs',
    ],
    specs: [
      ['Battery', '4000 mAh'],
      ['Runtime', 'Up to 10 h'],
      ['Charging', 'USB-C'],
    ],
  },
  {
    name: 'Insulated Water Bottle',
    sub: 'Home Accessories',
    supplier: 1,
    cost: 300,
    price: 890,
    sale: 750,
    photos: ['bottleGreen'],
    tags: ['Eco Friendly', 'New Arrival'],
    short: 'Double-wall vacuum bottle — cold for 24 h, hot for 12 h.',
    bullets: ['Leak-proof lid', 'BPA-free', 'Powder-coated grip'],
    specs: [
      ['Capacity', '750 ml'],
      ['Material', '18/8 stainless steel'],
    ],
  },
  // Beauty → Skincare
  {
    name: 'Hydrating Face Cleanser',
    sub: 'Skincare',
    supplier: 1,
    cost: 220,
    price: 650,
    sale: 550,
    photos: ['cleanser', 'skincareTube'],
    tags: ['Best Seller'],
    short: 'Gentle, non-foaming cleanser with ceramides — removes dirt without stripping moisture.',
    bullets: ['Suitable for all skin types', 'Fragrance free', 'Dermatologist tested'],
    specs: [
      ['Volume', '150 ml'],
      ['Skin type', 'All'],
    ],
  },
  {
    name: 'Vitamin C Serum',
    sub: 'Skincare',
    supplier: 1,
    cost: 380,
    price: 1190,
    sale: 990,
    photos: ['serumDropper', 'serumBottles'],
    tags: ['Trending'],
    short: 'Brightening serum with 15% vitamin C and hyaluronic acid for a glowing complexion.',
    bullets: ['15% vitamin C', 'With hyaluronic acid', 'Lightweight, fast-absorbing'],
    specs: [['Volume', '30 ml']],
  },
  {
    name: 'SPF 50 Sunscreen',
    sub: 'Skincare',
    supplier: 1,
    cost: 300,
    price: 850,
    photos: ['sunscreen', 'creamTube'],
    tags: ['New Arrival'],
    short: 'Broad-spectrum SPF 50 PA++++ with a light, no-white-cast finish.',
    bullets: ['SPF 50 PA++++', 'No white cast', 'Water resistant'],
    specs: [['Volume', '50 ml']],
  },
  // Beauty → Grooming
  {
    name: 'Professional Hair Dryer',
    sub: 'Grooming',
    supplier: 0,
    cost: 980,
    price: 2390,
    sale: 1990,
    photos: ['hairDryer'],
    tags: ['Gift Idea'],
    short: '2000W ionic hair dryer with 3 heat settings and a cool-shot button.',
    bullets: ['Ionic frizz control', '3 heat / 2 speed settings', 'Concentrator nozzle included'],
    specs: [
      ['Power', '2000W'],
      ['Cable', '1.8 m'],
    ],
  },
  {
    name: 'Luxury Eau de Parfum',
    sub: 'Grooming',
    supplier: 0,
    cost: 1500,
    price: 3500,
    sale: 2990,
    photos: ['perfume', 'perfumeRoses'],
    tags: ['Gift Idea', 'Trending'],
    short: 'A long-lasting floral-woody fragrance in an elegant gift-ready bottle.',
    bullets: ['Long-lasting (8+ h)', 'Gift-ready packaging'],
    specs: [
      ['Volume', '100 ml'],
      ['Concentration', 'Eau de Parfum'],
    ],
  },
  {
    name: 'Beard & Body Oil Set',
    sub: 'Grooming',
    supplier: 1,
    cost: 350,
    price: 990,
    photos: ['essentialOils'],
    tags: ['Eco Friendly'],
    short: 'Nourishing natural oils for beard and skin — argan, jojoba and cedarwood.',
    bullets: ['100% natural oils', 'Non-greasy'],
    specs: [['Contents', '3 × 30 ml']],
  },
];

/* ─── People ────────────────────────────────────────────────────────────── */

const CUSTOMER = { name: 'Rahim Uddin', email: 'customer@rfcgadget.com', phone: '01711000001' };
const REVIEWERS = [
  {
    name: 'Nusrat Jahan',
    email: 'nusrat@example.com',
    phone: '01811000002',
    city: 'Dhaka',
    zone: 'inside_dhaka' as const,
  },
  {
    name: 'Tanvir Hasan',
    email: 'tanvir@example.com',
    phone: '01911000003',
    city: 'Chattogram',
    zone: 'outside_dhaka' as const,
  },
  {
    name: 'Farzana Akter',
    email: 'farzana@example.com',
    phone: '01611000004',
    city: 'Dhaka',
    zone: 'inside_dhaka' as const,
  },
  {
    name: 'Sabbir Rahman',
    email: 'sabbir@example.com',
    phone: '01511000005',
    city: 'Sylhet',
    zone: 'outside_dhaka' as const,
  },
  {
    name: 'Mehedi Hasan',
    email: 'mehedi@example.com',
    phone: '01311000006',
    city: 'Dhaka',
    zone: 'inside_dhaka' as const,
  },
  {
    name: 'Ayesha Siddiqua',
    email: 'ayesha@example.com',
    phone: '01411000007',
    city: 'Khulna',
    zone: 'outside_dhaka' as const,
  },
];

/** Reviews: [reviewer index, product name, rating, comment, days ago]. */
const REVIEWS: [number, string, number, string, number][] = [
  [
    0,
    'Wireless Bluetooth Earbuds',
    5,
    'Sound quality is very good. Battery backup is impressive.',
    6,
  ],
  [1, 'Wireless Bluetooth Earbuds', 4, 'Good product for this price range.', 9],
  [
    2,
    'Wireless Bluetooth Earbuds',
    5,
    'Pairs instantly with my phone and the bass is great. Delivery was fast too.',
    12,
  ],
  [
    0,
    'Smart Watch Series 9',
    5,
    'Calling from the watch works perfectly. Battery lasts almost a week.',
    6,
  ],
  [
    3,
    'Smart Watch Series 9',
    4,
    'Looks premium and the step count is accurate. Strap could be softer.',
    14,
  ],
  [4, 'Smart Watch Series 9', 5, 'Best gift I bought for my brother. He loves it!', 18],
  [1, 'Premium Cotton T-Shirt', 5, 'Fabric is really soft and thick. Size L fits perfectly.', 9],
  [5, 'Premium Cotton T-Shirt', 4, 'Good quality cotton, colour did not fade after washing.', 20],
  [
    2,
    'Casual Polo Shirt',
    5,
    'Very smart polo, I wear it to the office. Will order other colours.',
    12,
  ],
  [3, 'Fast Charging Adapter 20W', 5, 'Charges my phone very quickly and does not heat up.', 14],
  [5, 'Fast Charging Adapter 20W', 4, 'Works as described. Compact size.', 20],
  [
    4,
    'Rechargeable LED Lamp',
    5,
    'Life saver during load-shedding. Light is bright and the battery lasts all evening.',
    18,
  ],
  [0, 'Portable Blender', 4, 'Makes smoothies easily. A bit noisy but very handy.', 6],
  [2, 'Hydrating Face Cleanser', 5, 'Gentle on my sensitive skin. Original product.', 12],
  [5, 'Vitamin C Serum', 4, 'Noticed a glow after two weeks of use.', 20],
  [1, 'Mechanical Keyboard', 5, 'Typing feels amazing. Build quality is excellent.', 9],
  [3, 'Wireless Mouse', 4, 'Silent clicks as promised. Good value.', 14],
  [4, 'Classic Leather Strap Watch', 5, 'Elegant watch, looks more expensive than it is.', 18],
];

/** Q&A: [asker index, product, question, answer | null, days ago]. */
const QUESTIONS: [number, string, string, string | null, number][] = [
  [
    0,
    'Wireless Bluetooth Earbuds',
    'Does this support Android phones?',
    'Yes, it supports all Android devices with Bluetooth.',
    15,
  ],
  [
    2,
    'Wireless Bluetooth Earbuds',
    'Can I use only one earbud at a time?',
    'Yes — either earbud works on its own for calls and music.',
    11,
  ],
  [
    1,
    'Smart Watch Series 9',
    'Will it show WhatsApp notifications?',
    'Yes, it shows notifications from WhatsApp, Messenger and other apps.',
    13,
  ],
  [
    3,
    'Smart Watch Series 9',
    'Is the strap replaceable?',
    'Yes, it uses standard 22 mm quick-release straps.',
    8,
  ],
  [
    4,
    'Premium Cotton T-Shirt',
    'What is the chest size for L?',
    'Size L fits a 40–42 inch chest.',
    10,
  ],
  [
    5,
    'Portable Blender',
    'Can it crush ice?',
    'It handles small ice cubes; we recommend adding a little liquid.',
    7,
  ],
  [
    0,
    'Rechargeable LED Lamp',
    'How long does a full charge take?',
    'About 3 hours with a 5V/2A adapter.',
    5,
  ],
  [1, 'Casual Polo Shirt', 'Is the navy colour available in XXL?', null, 1],
  [2, 'Fast Charging Adapter 20W', 'Does it work with iPhone 14?', null, 2],
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */

async function inBatches<T, R>(items: T[], size: number, fn: (t: T, i: number) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map((t, j) => fn(t, i + j)))));
  }
  return out;
}

/** Overwrite Mongoose's automatic timestamps so data spreads over past days. */
async function backdate(model: mongoose.Model<never>, id: unknown, at: Date) {
  await model.collection.updateOne(
    { _id: id as mongoose.Types.ObjectId },
    { $set: { createdAt: at, updatedAt: at } },
  );
}

const FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'completed',
];

/* ─── Main ──────────────────────────────────────────────────────────────── */

async function main() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  await connectDB();
  const db = mongoose.connection.name;
  console.log(`Demo seed → database "${db}"\n`);

  const models = [
    UserModel,
    AddressModel,
    SupplierModel,
    CategoryModel,
    TagModel,
    ProductModel,
    OrderModel,
    ReviewModel,
    QuestionModel,
    ReturnRequestModel,
    BannerModel,
    SettingsModel,
    CounterModel,
  ] as unknown as mongoose.Model<never>[];

  const hasData =
    (await ProductModel.estimatedDocumentCount()) > 0 ||
    (await OrderModel.estimatedDocumentCount()) > 0;
  if (RESET) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('Refusing to --reset with NODE_ENV=production.');
    await Promise.all(models.map((m) => m.deleteMany({})));
    console.log('✓ Reset: removed all existing store data');
  } else if (hasData) {
    throw new Error(
      `Database "${db}" already has products/orders. Re-run with --reset to wipe and recreate the demo data.`,
    );
  }
  await Promise.all(models.map((m) => m.syncIndexes()));

  /* Users */
  const hash = async (p: string) => bcrypt.hash(p, 12);
  const [adminHash, customerHash] = await Promise.all([
    hash('RfcGadget@12345'),
    hash('Customer@12345'),
  ]);
  await UserModel.create({
    name: 'RFC Gadget Admin',
    email: 'admin@rfcgadget.com',
    phone: '01330363517',
    passwordHash: adminHash,
    role: 'admin',
  });
  const customer = await UserModel.create({
    ...CUSTOMER,
    passwordHash: customerHash,
    role: 'customer',
  });
  await backdate(UserModel as never, customer._id, daysAgo(45));
  const reviewers = await Promise.all(
    REVIEWERS.map(async (r, i) => {
      const u = await UserModel.create({
        name: r.name,
        email: r.email,
        phone: r.phone,
        passwordHash: customerHash,
        role: 'customer',
      });
      await backdate(UserModel as never, u._id, daysAgo(40 - i * 3));
      return u;
    }),
  );
  const customerAddress = {
    fullName: CUSTOMER.name,
    phone: CUSTOMER.phone,
    addressLine: 'House 12, Road 5, Block C',
    area: 'Uttor Badda',
    city: 'Dhaka',
    zone: 'inside_dhaka' as ShippingZone,
  };
  await AddressModel.create([
    { ...customerAddress, user: customer._id, label: 'Home', isDefault: true },
    {
      ...customerAddress,
      user: customer._id,
      label: 'Office',
      addressLine: 'Level 7, Gulshan Avenue',
      area: 'Gulshan 1',
      isDefault: false,
    },
  ]);
  console.log(`✓ Users: admin, customer + ${reviewers.length} demo customers`);

  /* Suppliers, categories, tags */
  const suppliers = [
    await saveSupplier(
      supplierSchema.parse({
        name: 'ShopBase BD',
        websiteUrl: 'https://shopbasebd.com',
        status: 'active',
        notes: 'Gadgets, watches and accessories.',
      }),
    ),
    await saveSupplier(
      supplierSchema.parse({
        name: 'Merrono',
        websiteUrl: 'https://merrono.com',
        status: 'active',
        notes: 'Fashion, home and beauty products.',
      }),
    ),
  ];
  const subIds = new Map<string, { parent: string; sub: string }>();
  for (const [i, c] of CATEGORIES.entries()) {
    const parentImg = await cloudImage(c.image, `RFC-Gadget/categories/seed-${i}`, { w: 800, h: 800 });
    const parent = await saveCategory(
      categorySchema.parse({ name: c.name, image: parentImg, isFeatured: true, sortOrder: i }),
    );
    for (const [j, [name, img]] of c.children.entries()) {
      const subImg = await cloudImage(img, `RFC-Gadget/categories/seed-${i}-${j}`, { w: 800, h: 800 });
      const sub = await saveCategory(
        categorySchema.parse({ name, parent: parent.id, image: subImg, sortOrder: j }),
      );
      subIds.set(name, { parent: parent.id, sub: sub.id });
    }
  }
  const tagIds = new Map<string, string>();
  for (const t of TAGS) tagIds.set(t, (await saveTag(tagSchema.parse({ name: t }))).id);
  console.log(
    `✓ Suppliers (2), categories (${CATEGORIES.length} + ${subIds.size} sub), tags (${TAGS.length})`,
  );

  /* Products (images upload in parallel batches) */
  const productIds = new Map<string, string>();
  await inBatches(PRODUCTS, 4, async (p, idx) => {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const images = await Promise.all(p.photos.map((k, n) => productImage(k, slug, n + 1)));
    const cat = subIds.get(p.sub)!;
    const html = `<p>${p.short}</p><h3>Highlights</h3><ul>${p.bullets.map((b) => `<li>${b}</li>`).join('')}</ul><p>Delivered across Bangladesh with Cash on Delivery.</p>`;
    const { id } = await saveProduct(
      productSchema.parse({
        name: p.name,
        shortDescription: p.short,
        description: html,
        category: cat.parent,
        subCategory: cat.sub,
        tags: p.tags.map((t) => tagIds.get(t)!),
        supplier: suppliers[p.supplier]!.id,
        supplierProductUrl: `${suppliers[p.supplier]!.websiteUrl}/product/${slug}`,
        supplierPrice: p.cost,
        price: p.price,
        salePrice: p.sale ?? null,
        stockStatus: p.stock ?? 'in_stock',
        sku: `NV-${String(idx + 1).padStart(3, '0')}`,
        images: images.map((img, n) => ({ ...img, alt: `${p.name} — image ${n + 1}` })),
        variations: p.variations ?? [],
        specifications: p.specs.map(([label, value]) => ({ label, value })),
        seo: {
          metaTitle: `${p.name} — Buy online in Bangladesh`,
          metaDescription: p.short,
          keywords: p.tags,
        },
        isFeatured: p.featured ?? false,
      }),
    );
    productIds.set(p.name, id);
    await backdate(ProductModel as never, id, daysAgo(40 - idx));
  });
  console.log(`✓ Products: ${PRODUCTS.length} (images in RFC-Gadget/products/seed/)`);

  /* Combos */
  const pid = (name: string) => productIds.get(name)!;
  const combos = [
    {
      name: 'Smart Gadget Combo',
      items: [
        ['Smart Watch Series 9', 1],
        ['Wireless Bluetooth Earbuds', 1],
        ['Magnetic Charging Cable', 1],
      ],
      price: 3490,
      featured: true,
      short: 'Smart Watch + Wireless Earbuds + Charging Cable — everything you need, for less.',
    },
    {
      name: 'Home Kitchen Combo',
      items: [
        ['Portable Blender', 1],
        ['Ceramic Mug Set', 1],
        ['Kitchen Organizer Jar Set', 1],
      ],
      price: 2990,
      featured: false,
      short: 'Blend, sip and store — three kitchen favourites in one bundle.',
    },
    {
      name: 'Work From Home Combo',
      items: [
        ['Mechanical Keyboard', 1],
        ['Wireless Mouse', 1],
        ['Rechargeable LED Lamp', 1],
      ],
      price: 4490,
      featured: false,
      short: 'Upgrade your desk with a keyboard, mouse and cordless lamp.',
    },
  ] as const;
  const comboIds = new Map<string, string>();
  for (const c of combos) {
    const { id } = await saveCombo(
      comboSchema.parse({
        name: c.name,
        shortDescription: c.short,
        description: `<p>${c.short}</p><p>Save more by buying together — all items are covered by our usual quality check.</p>`,
        items: c.items.map(([n, q]) => ({ productId: pid(n), quantity: q })),
        comboPrice: c.price,
        isFeatured: c.featured,
      }),
    );
    comboIds.set(c.name, id);
  }
  console.log(`✓ Combo offers: ${combos.length}`);

  /* Banners */
  const banner = async (key: PhotoKey, id: string, input: Record<string, unknown>, wide = true) => {
    const image = await cloudImage(
      key,
      `RFC-Gadget/banners/seed-${id}`,
      wide ? { w: 1800, h: 760 } : { w: 900, h: 720 },
    );
    await saveBanner(bannerSchema.parse({ image, ...input }) as BannerOutput);
  };
  await banner('laptopDesk', 'mega-gadget-sale', {
    position: 'hero',
    sortOrder: 0,
    eyebrow: 'Up to 40% off',
    title: 'Mega Gadget Sale',
    description: 'Earbuds, smart watches, chargers and more at the year’s best prices.',
    ctaLabel: 'Shop gadgets',
    link: '/products?category=electronics',
  });
  await banner('teeBlackMan', 'new-collection', {
    position: 'hero',
    sortOrder: 1,
    eyebrow: 'Just landed',
    title: 'New Collection Arrived',
    description: 'Fresh tees and polos in premium cotton.',
    ctaLabel: 'Explore fashion',
    link: '/products?category=fashion',
  });
  await banner('makeupBrushes', 'beauty-week', {
    position: 'hero',
    sortOrder: 2,
    eyebrow: 'Beauty week',
    title: 'Glow up for less',
    description: 'Skincare and grooming essentials up to 25% off.',
    ctaLabel: 'Shop beauty',
    link: '/products?category=beauty-personal-care',
  });
  await banner(
    'laptopCamera',
    'combo-offer',
    {
      position: 'hero_side',
      sortOrder: 0,
      eyebrow: 'Combo offer',
      title: 'Buy More Save More',
      description: 'Bundles at better prices.',
      ctaLabel: 'View combos',
      link: '/combo-offers',
    },
    false,
  );
  await banner(
    'appleWatch',
    'watch-deals',
    {
      position: 'hero_side',
      sortOrder: 1,
      eyebrow: 'Hot deal',
      title: 'Smart Watch Series 9',
      description: 'Now only ৳1,990.',
      ctaLabel: 'Buy now',
      link: '/products/smart-watch-series-9',
    },
    false,
  );
  await banner('watchFossil', 'eid-special', {
    position: 'special',
    eyebrow: 'Eid special',
    title: 'Gifts they’ll love',
    description: 'Watches, perfumes and gadgets — gift-ready with Cash on Delivery.',
    ctaLabel: 'Shop gifts',
    link: '/products?tags=gift-idea',
  });
  await banner('kitchen', 'bundle-save', {
    position: 'combo',
    eyebrow: 'Combo offers',
    title: 'Bundle & save more',
    description: 'Curated combos at prices lower than buying separately.',
  });
  console.log('✓ Banners: 7 (images in RFC-Gadget/banners/)');

  /* Orders, reviews, Q&A, returns */
  const productsByName = new Map(
    (
      await ProductModel.find(
        {},
        'name slug images effectivePrice supplierPrice sku supplier supplierProductUrl variations type comboItems',
      )
        .populate('supplier', 'name')
        .lean()
    ).map((p) => [p.name, p]),
  );
  const line = (name: string, qty = 1, variant: Record<string, string> = {}) => {
    const p = productsByName.get(name)!;
    const sup = p.supplier as unknown as { _id: mongoose.Types.ObjectId; name: string } | null;
    return {
      product: p._id,
      name: p.name,
      slug: p.slug,
      image: p.images[0]?.url,
      sku: p.sku,
      variant,
      quantity: qty,
      unitPrice: p.effectivePrice,
      supplierPrice: p.supplierPrice,
      lineTotal: p.effectivePrice * qty,
      supplier: sup?._id ?? null,
      supplierName: sup?.name,
      supplierProductUrl: p.supplierProductUrl,
      components: [],
    };
  };
  const optionsFor = (name: string) =>
    Object.fromEntries(
      (productsByName.get(name)!.variations ?? [])
        .filter((v) => v.values.length)
        .map((v) => [v.name, v.values[Math.min(1, v.values.length - 1)]!]),
    );

  type NewOrder = {
    user?: mongoose.Types.ObjectId | null;
    name: string;
    phone: string;
    email?: string;
    city: string;
    zone: ShippingZone;
    area?: string;
    platform: OrderPlatform;
    status: OrderStatus | 'cancelled';
    items: [string, number][];
    daysAgo: number;
    note?: string;
    adminNote?: string;
  };
  const sold = new Map<string, number>();
  const createOrder = async (o: NewOrder) => {
    const items = o.items.map(([n, q]) => line(n, q, optionsFor(n)));
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const shippingFee = o.zone === 'inside_dhaka' ? 70 : 130;
    const created = daysAgo(o.daysAgo, 10 + (o.daysAgo % 8));
    const reached: OrderStatus[] =
      o.status === 'cancelled' ? ['pending'] : FLOW.slice(0, FLOW.indexOf(o.status) + 1);
    const at = (k: number) => new Date(created.getTime() + k * 0.45 * DAY);
    const history: { status: OrderStatus; at: Date; note?: string }[] = [
      ...reached.map((s, k) => ({
        status: s,
        at: at(k),
        note: s === 'shipped' ? 'Handed to Pathao Courier' : undefined,
      })),
      ...(o.status === 'cancelled'
        ? [{ status: 'cancelled' as const, at: at(1), note: 'Customer changed their mind' }]
        : []),
    ];
    const deliveredAt = history.find((h) => h.status === 'delivered')?.at;
    const order = await OrderModel.create({
      orderNumber: `NV-${await nextSequence('order')}`,
      user: o.user ?? null,
      customer: { name: o.name, phone: o.phone, email: o.email },
      shippingAddress: {
        fullName: o.name,
        phone: o.phone,
        addressLine: 'House 8, Road 3',
        area: o.area ?? 'Sadar',
        city: o.city,
        zone: o.zone,
      },
      items,
      subtotal,
      shippingFee,
      discount: 0,
      total: subtotal + shippingFee,
      supplierCost: items.reduce((s, i) => s + i.supplierPrice * i.quantity, 0),
      paymentMethod: 'cod',
      paymentStatus: deliveredAt ? 'paid' : 'unpaid',
      platform: o.platform,
      status: o.status,
      statusHistory: history,
      customerNote: o.note,
      adminNote: o.adminNote,
      confirmedAt: history.find((h) => h.status === 'confirmed')?.at,
      shippedAt: history.find((h) => h.status === 'shipped')?.at,
      deliveredAt,
      cancelledAt: o.status === 'cancelled' ? at(1) : undefined,
      cancelReason: o.status === 'cancelled' ? 'Customer changed their mind' : undefined,
    });
    await OrderModel.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt: created, updatedAt: history[history.length - 1]!.at } },
    );
    if (o.status !== 'cancelled') for (const [n, q] of o.items) sold.set(n, (sold.get(n) ?? 0) + q);
    return order;
  };

  // The demo customer's own history — every status, several platforms.
  const C = {
    user: customer._id,
    name: CUSTOMER.name,
    phone: CUSTOMER.phone,
    email: CUSTOMER.email,
    city: 'Dhaka',
    area: 'Uttor Badda',
    zone: 'inside_dhaka' as ShippingZone,
  };
  const delivered = await createOrder({
    ...C,
    platform: 'website',
    status: 'delivered',
    items: [
      ['Wireless Bluetooth Earbuds', 1],
      ['Fast Charging Adapter 20W', 1],
    ],
    daysAgo: 4,
    note: 'Please call before delivery.',
  });
  await createOrder({
    ...C,
    platform: 'facebook',
    status: 'processing',
    items: [['Smart Watch Series 9', 1]],
    daysAgo: 2,
    adminNote: 'Ordered via Facebook page inbox.',
  });
  await createOrder({
    ...C,
    platform: 'messenger',
    status: 'pending',
    items: [
      ['Premium Cotton T-Shirt', 2],
      ['Casual Polo Shirt', 1],
    ],
    daysAgo: 0,
  });
  await createOrder({
    ...C,
    platform: 'website',
    status: 'confirmed',
    items: [['Rechargeable LED Lamp', 1]],
    daysAgo: 1,
  });
  await createOrder({
    ...C,
    platform: 'instagram',
    status: 'shipped',
    items: [
      ['Vitamin C Serum', 1],
      ['Hydrating Face Cleanser', 1],
    ],
    daysAgo: 3,
  });
  await createOrder({
    ...C,
    platform: 'website',
    status: 'completed',
    items: [['Mechanical Keyboard', 1]],
    daysAgo: 21,
  });
  await createOrder({
    ...C,
    platform: 'website',
    status: 'cancelled',
    items: [['Wireless Game Controller', 1]],
    daysAgo: 16,
  });
  const forReturnApproved = await createOrder({
    ...C,
    platform: 'website',
    status: 'delivered',
    items: [['Graphic Print T-Shirt', 1]],
    daysAgo: 6,
  });
  const forReturnRejected = await createOrder({
    ...C,
    platform: 'whatsapp',
    status: 'delivered',
    items: [['Insulated Water Bottle', 1]],
    daysAgo: 5,
  });

  // Reviewers' delivered orders (so their reviews are verified purchases).
  const reviewOrders = new Map<string, mongoose.Types.ObjectId>();
  for (const [i, r] of REVIEWERS.entries()) {
    const mine = REVIEWS.filter((x) => x[0] === i);
    const order = await createOrder({
      user: reviewers[i]!._id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      city: r.city,
      zone: r.zone,
      platform: i % 2 ? 'facebook' : 'website',
      status: 'completed',
      items: [...new Set(mine.map((x) => x[1]))].map((n) => [n, 1] as [string, number]),
      daysAgo: Math.max(...mine.map((x) => x[4])) + 3,
    });
    for (const n of mine.map((x) => x[1])) reviewOrders.set(`${i}:${n}`, order._id);
  }

  // Guest & social orders spread over the last month for the dashboard chart.
  const GUESTS: [string, string, string, ShippingZone][] = [
    ['Jannatul Ferdous', '01720000011', 'Dhaka', 'inside_dhaka'],
    ['Arif Chowdhury', '01820000012', 'Rajshahi', 'outside_dhaka'],
    ['Sumaiya Islam', '01920000013', 'Dhaka', 'inside_dhaka'],
    ['Rakib Hossain', '01620000014', 'Cumilla', 'outside_dhaka'],
    ['Tahmina Khatun', '01520000015', 'Gazipur', 'outside_dhaka'],
    ['Imran Kabir', '01320000016', 'Dhaka', 'inside_dhaka'],
  ];
  const names = PRODUCTS.filter((p) => p.stock !== 'out_of_stock').map((p) => p.name);
  const platforms: OrderPlatform[] = [
    'website',
    'facebook',
    'messenger',
    'instagram',
    'tiktok',
    'whatsapp',
    'website',
    'facebook',
  ];
  const later: OrderStatus[] = [
    'completed',
    'delivered',
    'completed',
    'shipped',
    'completed',
    'delivered',
  ];
  for (let k = 0; k < 18; k++) {
    const [name, phone, city, zone] = GUESTS[k % GUESTS.length]!;
    const d = 1 + ((k * 7) % 28);
    await createOrder({
      name,
      phone,
      city,
      zone,
      platform: platforms[k % platforms.length]!,
      status: d <= 2 ? (['pending', 'confirmed'] as const)[k % 2]! : later[k % later.length]!,
      items: [
        [names[(k * 5) % names.length]!, 1 + (k % 2)],
        ...(k % 3 === 0 ? [[names[(k * 11 + 3) % names.length]!, 1] as [string, number]] : []),
      ],
      daysAgo: d,
    });
  }
  await ProductModel.bulkWrite(
    [...sold].map(([n, q]) => ({
      updateOne: { filter: { name: n }, update: { $set: { soldCount: q } } },
    })),
  );
  console.log(`✓ Orders: ${await OrderModel.countDocuments()} across all statuses and platforms`);

  // Reviews (backdated) + recomputed product ratings.
  for (const [i, name, rating, comment, d] of REVIEWS) {
    const review = await ReviewModel.create({
      product: pid(name),
      user: reviewers[i]!._id,
      order: reviewOrders.get(`${i}:${name}`)!,
      rating,
      comment,
      images: [],
    });
    await backdate(ReviewModel as never, review._id, daysAgo(d - 1, 18));
  }
  const ratings = await ReviewModel.aggregate<{
    _id: mongoose.Types.ObjectId;
    avg: number;
    n: number;
  }>([
    { $match: { isHidden: false } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await ProductModel.bulkWrite(
    ratings.map((r) => ({
      updateOne: {
        filter: { _id: r._id },
        update: { $set: { ratingAverage: Math.round(r.avg * 10) / 10, ratingCount: r.n } },
      },
    })),
  );
  console.log(`✓ Reviews: ${REVIEWS.length}`);

  const admin = await UserModel.findOne({ role: 'admin' }).lean();
  for (const [i, name, question, answer, d] of QUESTIONS) {
    const q = await QuestionModel.create({
      product: pid(name),
      user: reviewers[i]!._id,
      question,
      ...(answer ? { answer, answeredAt: daysAgo(d - 1), answeredBy: admin!._id } : {}),
    });
    await backdate(QuestionModel as never, q._id, daysAgo(d, 15));
  }
  console.log(
    `✓ Questions: ${QUESTIONS.length} (${QUESTIONS.filter((q) => !q[3]).length} awaiting an answer)`,
  );

  // Returns: pending, approved (order → returned), rejected.
  const mkReturn = async (
    order: typeof delivered,
    status: 'pending' | 'approved' | 'rejected',
    reason: string,
    description: string,
    note?: string,
  ) => {
    const r = await ReturnRequestModel.create({
      order: order._id,
      orderNumber: order.orderNumber,
      user: customer._id,
      reason,
      description,
      images: [],
      status,
      adminNote: note,
      ...(status !== 'pending' ? { resolvedAt: daysAgo(1), resolvedBy: admin!._id } : {}),
      ...(status === 'approved' ? { refundAmount: order.total - order.shippingFee } : {}),
    });
    await backdate(ReturnRequestModel as never, r._id, daysAgo(2, 13));
    if (status === 'approved') {
      await OrderModel.updateOne(
        { _id: order._id },
        {
          $set: { status: 'returned' },
          $push: {
            statusHistory: {
              status: 'returned',
              note: `Return approved: ${reason}`,
              at: daysAgo(1),
              by: admin!._id,
            },
          },
        },
      );
    }
  };
  await mkReturn(
    delivered,
    'pending',
    'Damaged product',
    'The charging case has a crack on the lid.',
  );
  await mkReturn(
    forReturnApproved,
    'approved',
    'Size or fit issue',
    'The shirt is too small, I need a bigger size.',
    'Approved — our courier will pick it up tomorrow.',
  );
  await mkReturn(
    forReturnRejected,
    'rejected',
    'Not as described',
    'Colour looks slightly different from the photo.',
    'The colour matches the listing; photos may vary slightly by screen.',
  );
  console.log('✓ Return requests: pending, approved, rejected');

  await SettingsModel.updateOne(
    { key: 'store' },
    {
      $set: {
        key: 'store',
        supportEmail: 'support@rfcgadget.com',
        social: {
          facebook: 'https://facebook.com/rfcgadget',
          instagram: 'https://instagram.com/rfcgadget',
          whatsapp: '01330363517',
        },
      },
    },
    { upsert: true },
  );

  console.log('\nDone. Demo logins:');
  console.log('  admin@rfcgadget.com    / RfcGadget@12345');
  console.log('  customer@rfcgadget.com / Customer@12345');
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('\n✗ Seed failed:', e instanceof Error ? e.message : e);
  await mongoose.disconnect();
  process.exit(1);
});
