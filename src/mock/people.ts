import type { PaymentMethod, Seller, SellerStatus } from '@/types/platform';

/** The demo accounts used by the role selector on the login page. */
export const DEMO_ADMIN = {
  id: 'adm-001',
  name: 'Arif Hossain',
  email: 'admin@demo.local',
  phone: '01700-000000',
  role: 'Super Admin',
};

export const DEMO_SELLER_ID = 'sel-001';

type SellerSeed = [
  name: string,
  shopName: string,
  district: string,
  status: SellerStatus,
  method: PaymentMethod,
];

const SEEDS: SellerSeed[] = [
  ['Sadia Rahman', "Sadia's Corner", 'Dhaka', 'active', 'bkash'],
  ['Tanvir Hasan', 'Gadget Point BD', 'Chattogram', 'active', 'nagad'],
  ['Nusrat Jahan', 'Nusrat Fashion House', 'Dhaka', 'active', 'bkash'],
  ['Mahmudul Hasan', 'Smart Deals', 'Gazipur', 'active', 'rocket'],
  ['Farhana Akter', 'Farhana Collection', 'Sylhet', 'active', 'bkash'],
  ['Rakibul Islam', 'RK Online Shop', 'Rajshahi', 'active', 'nagad'],
  ['Jannatul Ferdous', 'Jannat Beauty Box', 'Khulna', 'active', 'bkash'],
  ['Imran Hossain', 'Daily Needs BD', 'Narayanganj', 'active', 'bank'],
  ['Sumaiya Islam', 'Sumaiya Kids World', 'Cumilla', 'active', 'bkash'],
  ['Arifur Rahman', 'Arif Gadget Zone', 'Bogura', 'active', 'nagad'],
  ['Mehedi Hasan', 'Mehedi Mart', 'Mymensingh', 'active', 'bkash'],
  ['Tasnim Ahmed', 'Tasnim Style', 'Dhaka', 'active', 'rocket'],
  ['Shakil Ahmed', 'Shakil Sports', 'Barishal', 'active', 'bkash'],
  ['Lamia Chowdhury', 'Lamia Home Decor', 'Chattogram', 'active', 'nagad'],
  ['Hasibul Karim', 'HK Trading', 'Rangpur', 'inactive', 'bkash'],
  ['Moumita Das', 'Moumita Shop', 'Jashore', 'active', 'bkash'],
  ['Sabbir Hossain', 'Sabbir Electronics', 'Dhaka', 'suspended', 'nagad'],
  ['Rumana Begum', 'Rumana Boutique', 'Tangail', 'active', 'bkash'],
  ['Nafis Iqbal', 'Nafis Online', 'Feni', 'pending', 'bkash'],
  ['Sharmin Sultana', 'Sharmin Beauty Care', 'Noakhali', 'pending', 'nagad'],
  ['Asif Mahmud', 'Asif Deals Hub', 'Dinajpur', 'pending', 'rocket'],
  ['Tahmina Khatun', 'Tahmina Craft', 'Pabna', 'pending', 'bkash'],
  ['Robiul Awal', 'Robi Mobile Store', "Cox's Bazar", 'pending', 'bkash'],
  ['Priyanka Saha', 'Priyanka Fashion', 'Kushtia', 'inactive', 'nagad'],
];

const AVATAR_COLORS = ['#219ebc', '#fb8500', '#023047', '#ffb703', '#5fb6d8', '#136780'];

function phoneFor(i: number) {
  const prefixes = ['017', '018', '019', '015', '016', '013'];
  const tail = String(10_000_000 + ((i * 7_919_311) % 89_999_999)).slice(0, 8);
  return `${prefixes[i % prefixes.length]}${tail}`;
}

function emailFor(name: string) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@mail.example`;
}

/** `joinedAt` is filled relative to "now" by the generator. */
export function buildSellers(now: number): Seller[] {
  const day = 86_400_000;
  return SEEDS.map(([name, shopName, district, status, method], i) => {
    const phone = phoneFor(i);
    // Pending sellers registered in the last few days; the rest over ~6 months.
    const ageDays = status === 'pending' ? 1 + (i % 5) : 175 - i * 6;
    return {
      id: `sel-${String(i + 1).padStart(3, '0')}`,
      name,
      shopName,
      email: emailFor(name),
      phone,
      district,
      address: `House ${12 + i}, Road ${3 + (i % 9)}, ${district}`,
      status,
      joinedAt: new Date(now - ageDays * day).toISOString(),
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length]!,
      payout: { method, account: method === 'bank' ? `1021-0045-${3300 + i}` : phone },
    };
  });
}
