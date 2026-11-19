import { ProductGridSkeleton } from '@/features/products/product-card';

export default function ComboOffersLoading() {
  return (
    <div className="bg-surface" aria-busy="true" aria-label="Loading">
      <div className="container-page py-6 sm:py-8">
        <div className="skeleton mb-4 h-3.5 w-32" />
        <div className="skeleton aspect-[16/9] w-full rounded-2xl sm:aspect-[3/1] sm:rounded-3xl lg:aspect-auto lg:h-[280px]" />
        <div className="mt-8 mb-5 space-y-2">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-4 w-36" />
        </div>
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}
