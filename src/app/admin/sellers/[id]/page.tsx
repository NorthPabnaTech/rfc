import { SellerDetail } from './seller-detail';

export default async function AdminSellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerDetail id={id} />;
}
