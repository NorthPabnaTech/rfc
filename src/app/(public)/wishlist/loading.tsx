import { ProductGridSkeleton } from '@/features/products/product-card';

export default function WishlistLoading() {
  return (
    <div className="bg-surface" aria-busy="true" aria-label="Loading">
      <div className="container-page py-8">
        <div className="skeleton h-10 w-44" />
        <div className="skeleton mt-2 h-4 w-64" />
        <div className="mt-6">
          <ProductGridSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}
