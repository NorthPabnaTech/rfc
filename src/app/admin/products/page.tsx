import type { Metadata } from 'next';

import { ProductList } from './components/product-list';

export const metadata: Metadata = { title: 'Products' };

export default function AdminProductsPage() {
  return <ProductList />;
}
