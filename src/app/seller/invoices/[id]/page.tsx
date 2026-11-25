import { SellerInvoice } from './seller-invoice';

export default async function SellerInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerInvoice id={id} />;
}
