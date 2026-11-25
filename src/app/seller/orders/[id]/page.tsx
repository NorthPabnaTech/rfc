import { SellerOrderDetail } from './order-detail';

export default async function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerOrderDetail id={id} />;
}
