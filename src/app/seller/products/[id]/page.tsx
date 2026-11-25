import { SellerProductDetail } from './product-detail';

export default async function SellerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerProductDetail id={id} />;
}
