import type { Category, Product, Supplier } from '@/types/platform';

/*
 * Mock catalog. Prices are whole Taka. Product images are "art:<n>" tokens —
 * the ProductImage component draws a themed illustration for them, so the demo
 * needs no external image hosts. Uploaded images (data URLs) also work.
 */

export const CATEGORIES: Category[] = [
  {
    id: 'cat-gadgets',
    name: 'Gadgets & Electronics',
    nameBn: 'গ্যাজেট ও ইলেকট্রনিক্স',
    slug: 'gadgets',
    icon: 'headphones',
    description: 'Earbuds, smart watches, speakers and everyday tech.',
  },
  {
    id: 'cat-mobile',
    name: 'Mobile Accessories',
    nameBn: 'মোবাইল এক্সেসরিজ',
    slug: 'mobile-accessories',
    icon: 'smartphone',
    description: 'Chargers, cables, power banks, covers and holders.',
  },
  {
    id: 'cat-men',
    name: "Men's Fashion",
    nameBn: 'ছেলেদের ফ্যাশন',
    slug: 'mens-fashion',
    icon: 'shirt',
    description: 'T-shirts, panjabi, wallets, belts and footwear.',
  },
  {
    id: 'cat-women',
    name: "Women's Fashion",
    nameBn: 'মেয়েদের ফ্যাশন',
    slug: 'womens-fashion',
    icon: 'dress',
    description: 'Three-piece, kurti, bags and jewellery.',
  },
  {
    id: 'cat-home',
    name: 'Home & Kitchen',
    nameBn: 'হোম ও কিচেন',
    slug: 'home-kitchen',
    icon: 'kitchen',
    description: 'Cookware, storage, décor and smart home helpers.',
  },
  {
    id: 'cat-beauty',
    name: 'Beauty & Personal Care',
    nameBn: 'বিউটি ও পার্সোনাল কেয়ার',
    slug: 'beauty',
    icon: 'perfume',
    description: 'Skin care, hair care, grooming and fragrance.',
  },
  {
    id: 'cat-kids',
    name: 'Kids & Baby',
    nameBn: 'কিডস ও বেবি',
    slug: 'kids-baby',
    icon: 'baby',
    description: 'Toys, baby care and learning products.',
  },
  {
    id: 'cat-sports',
    name: 'Sports & Fitness',
    nameBn: 'স্পোর্টস ও ফিটনেস',
    slug: 'sports',
    icon: 'dumbbell',
    description: 'Fitness gear, outdoor and cycling accessories.',
  },
];

export const SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Dhaka Gadget House',
    contactPerson: 'Rafiqul Islam',
    phone: '01711-234567',
    email: 'orders@dhakagadget.example',
    sourceUrl: 'https://dhakagadget.example',
    status: 'active',
    notes: 'Fast dispatch from Motijheel. Daily pickup before 3 PM.',
    createdAt: '2026-03-02T10:00:00.000Z',
  },
  {
    id: 'sup-2',
    name: 'Chawkbazar Wholesale Mart',
    contactPerson: 'Mizanur Rahman',
    phone: '01819-445566',
    email: 'sales@chawkbazarmart.example',
    sourceUrl: 'https://chawkbazarmart.example',
    status: 'active',
    notes: 'Bulk home & kitchen items. Confirm stock by phone.',
    createdAt: '2026-03-15T10:00:00.000Z',
  },
  {
    id: 'sup-3',
    name: 'Narayanganj Textile Hub',
    contactPerson: 'Shahana Akter',
    phone: '01912-778899',
    email: 'hub@ngtextile.example',
    sourceUrl: 'https://ngtextile.example',
    status: 'active',
    notes: 'Clothing; sizes vary by batch. 2-day lead time.',
    createdAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'sup-4',
    name: 'Glow Beauty Importers',
    contactPerson: 'Nusrat Jahan',
    phone: '01611-223344',
    email: 'b2b@glowbeauty.example',
    sourceUrl: 'https://glowbeauty.example',
    status: 'active',
    notes: 'Authentic imported cosmetics. Check expiry on arrival.',
    createdAt: '2026-04-20T10:00:00.000Z',
  },
  {
    id: 'sup-5',
    name: 'Little Star Toys BD',
    contactPerson: 'Kamrul Hasan',
    phone: '01558-990011',
    email: 'hello@littlestar.example',
    sourceUrl: 'https://littlestar.example',
    status: 'active',
    notes: 'Kids products; safe-material certificates on request.',
    createdAt: '2026-05-05T10:00:00.000Z',
  },
  {
    id: 'sup-6',
    name: 'FitZone Sports Supply',
    contactPerson: 'Tanvir Ahmed',
    phone: '01313-556677',
    email: 'supply@fitzone.example',
    sourceUrl: 'https://fitzone.example',
    status: 'inactive',
    notes: 'Paused — pricing renegotiation in progress.',
    createdAt: '2026-05-18T10:00:00.000Z',
  },
];

type Seed = [
  name: string,
  nameBn: string,
  categoryId: string,
  supplierId: string,
  supplierCost: number,
  margin: number,
  suggested: number,
  availability?: Product['availability'],
  status?: Product['status'],
];

const SEEDS: Seed[] = [
  [
    'TWS Pro Wireless Earbuds',
    'টিডব্লিউএস প্রো ওয়্যারলেস ইয়ারবাড',
    'cat-gadgets',
    'sup-1',
    850,
    120,
    1350,
  ],
  [
    'Smart Watch Series 8 Ultra',
    'স্মার্ট ওয়াচ সিরিজ ৮ আল্ট্রা',
    'cat-gadgets',
    'sup-1',
    1450,
    180,
    2200,
  ],
  ['Portable Bluetooth Speaker', 'পোর্টেবল ব্লুটুথ স্পিকার', 'cat-gadgets', 'sup-1', 690, 90, 1100],
  [
    'Mini Rechargeable Fan',
    'মিনি রিচার্জেবল ফ্যান',
    'cat-gadgets',
    'sup-1',
    420,
    60,
    690,
    'limited',
  ],
  ['LED Ring Light 10 inch', 'এলইডি রিং লাইট ১০ ইঞ্চি', 'cat-gadgets', 'sup-1', 520, 70, 850],
  [
    '20W Fast Charger (Type-C)',
    '২০ ওয়াট ফাস্ট চার্জার (টাইপ-সি)',
    'cat-mobile',
    'sup-1',
    320,
    50,
    550,
  ],
  [
    '10000mAh Slim Power Bank',
    '১০০০০ এমএএইচ স্লিম পাওয়ার ব্যাংক',
    'cat-mobile',
    'sup-1',
    780,
    100,
    1250,
  ],
  ['Magnetic Car Phone Holder', 'ম্যাগনেটিক কার ফোন হোল্ডার', 'cat-mobile', 'sup-1', 240, 40, 450],
  [
    'Braided USB-C Cable 1.5m',
    'ব্রেইডেড ইউএসবি-সি ক্যাবল ১.৫ মি.',
    'cat-mobile',
    'sup-1',
    140,
    30,
    290,
  ],
  [
    'Phone Tripod Stand with Remote',
    'রিমোটসহ ফোন ট্রাইপড স্ট্যান্ড',
    'cat-mobile',
    'sup-1',
    380,
    50,
    650,
    'out_of_stock',
  ],
  ['Premium Cotton Polo T-Shirt', 'প্রিমিয়াম কটন পোলো টি-শার্ট', 'cat-men', 'sup-3', 320, 50, 590],
  ['Embroidered Cotton Panjabi', 'এমব্রয়ডারি কটন পাঞ্জাবি', 'cat-men', 'sup-3', 890, 110, 1450],
  ['Genuine Leather Wallet', 'জেনুইন লেদার ওয়ালেট', 'cat-men', 'sup-3', 450, 60, 790],
  ['Casual Loafer Shoes', 'ক্যাজুয়াল লোফার জুতা', 'cat-men', 'sup-3', 1150, 150, 1790],
  [
    'Printed Three-Piece (Unstitched)',
    'প্রিন্টেড থ্রি-পিস (আনস্টিচড)',
    'cat-women',
    'sup-3',
    980,
    120,
    1590,
  ],
  ['Georgette Long Kurti', 'জর্জেট লং কুর্তি', 'cat-women', 'sup-3', 650, 80, 1090],
  ['Ladies Vanity Hand Bag', 'লেডিস ভ্যানিটি হ্যান্ড ব্যাগ', 'cat-women', 'sup-3', 720, 90, 1190],
  [
    'Oxidised Jewellery Set',
    'অক্সিডাইজড জুয়েলারি সেট',
    'cat-women',
    'sup-3',
    360,
    50,
    650,
    'limited',
  ],
  ['Non-Stick Fry Pan 26cm', 'নন-স্টিক ফ্রাই প্যান ২৬ সেমি', 'cat-home', 'sup-2', 690, 80, 1090],
  ['Electric Kettle 1.8L', 'ইলেকট্রিক কেটলি ১.৮ লিটার', 'cat-home', 'sup-2', 750, 90, 1190],
  ['Vegetable Chopper 5-in-1', 'ভেজিটেবল চপার ৫-ইন-১', 'cat-home', 'sup-2', 430, 60, 750],
  ['Airtight Food Container Set', 'এয়ারটাইট ফুড কন্টেইনার সেট', 'cat-home', 'sup-2', 520, 70, 850],
  [
    'Motion Sensor LED Light',
    'মোশন সেন্সর এলইডি লাইট',
    'cat-home',
    'sup-2',
    260,
    40,
    490,
    'in_stock',
    'draft',
  ],
  [
    'Vitamin C Face Serum 30ml',
    'ভিটামিন সি ফেস সিরাম ৩০ মি.লি.',
    'cat-beauty',
    'sup-4',
    380,
    60,
    690,
  ],
  ['Herbal Hair Oil 200ml', 'হারবাল হেয়ার অয়েল ২০০ মি.লি.', 'cat-beauty', 'sup-4', 210, 40, 420],
  ['Rechargeable Hair Trimmer', 'রিচার্জেবল হেয়ার ট্রিমার', 'cat-beauty', 'sup-4', 890, 110, 1390],
  ['Long-Lasting Attar 12ml', 'লং-লাস্টিং আতর ১২ মি.লি.', 'cat-beauty', 'sup-4', 280, 40, 520],
  ['Educational Building Blocks', 'এডুকেশনাল বিল্ডিং ব্লকস', 'cat-kids', 'sup-5', 540, 70, 890],
  ['Baby Feeding Bottle Set', 'বেবি ফিডিং বোতল সেট', 'cat-kids', 'sup-5', 390, 50, 650],
  ['Remote Control Racing Car', 'রিমোট কন্ট্রোল রেসিং কার', 'cat-kids', 'sup-5', 980, 120, 1550],
  [
    'Adjustable Dumbbell Set 10kg',
    'অ্যাডজাস্টেবল ডাম্বেল সেট ১০ কেজি',
    'cat-sports',
    'sup-6',
    1650,
    200,
    2490,
  ],
  [
    'Anti-Slip Yoga Mat 6mm',
    'অ্যান্টি-স্লিপ ইয়োগা ম্যাট ৬ মি.মি.',
    'cat-sports',
    'sup-6',
    550,
    70,
    890,
  ],
];

const DESCRIPTIONS: Record<string, string> = {
  'cat-gadgets':
    'Reliable everyday gadget with a clean finish and a simple setup. Sourced from a verified supplier and checked before dispatch. Comes in the original box with the user manual.',
  'cat-mobile':
    'Durable mobile accessory that works with most Android and iPhone models. Compact, travel-friendly and tested for safe charging.',
  'cat-men':
    'Comfortable, breathable fabric with neat stitching. Available sizes depend on the supplier batch — confirm the size with your customer before ordering.',
  'cat-women':
    'Elegant design with quality fabric and finishing, suitable for daily wear and occasions. Colours may vary slightly from the photos.',
  'cat-home':
    'Practical home and kitchen essential made from food-safe, easy-to-clean materials. Ideal for busy households.',
  'cat-beauty':
    'Gentle, skin-friendly formula. Patch test before first use. Check the expiry date printed on the pack.',
  'cat-kids':
    'Child-friendly design made from safe, non-toxic materials. Recommended for the age group printed on the box.',
  'cat-sports':
    'Built for regular workouts at home or outdoors. Sturdy grip and long-lasting materials.',
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const PRODUCTS: Product[] = SEEDS.map((s, i) => {
  const [
    name,
    nameBn,
    categoryId,
    supplierId,
    supplierCost,
    margin,
    suggested,
    availability,
    status,
  ] = s;
  return {
    id: `prd-${String(i + 1).padStart(3, '0')}`,
    name,
    nameBn,
    slug: slugify(name),
    description: DESCRIPTIONS[categoryId] ?? '',
    images: [`art:${i}`, `art:${i + 7}`, `art:${i + 13}`],
    categoryId,
    supplierId,
    supplierCost,
    platformMargin: margin,
    // Extra delivery charge for bulky items, added on top of the area charge.
    deliveryCharge: supplierCost >= 1400 ? 30 : 0,
    packagingCharge: supplierCost > 1000 ? 30 : 20,
    status: availability === 'out_of_stock' ? 'out_of_stock' : (status ?? 'active'),
    availability: availability ?? 'in_stock',
    suggestedPrice: suggested,
    createdAt: new Date(Date.UTC(2026, 5, 1 + i)).toISOString(),
  };
});
