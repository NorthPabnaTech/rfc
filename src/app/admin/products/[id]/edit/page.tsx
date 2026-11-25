import { EditProduct } from '../../components/product-detail';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditProduct id={id} />;
}
