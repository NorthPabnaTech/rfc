import { ProductGridSkeleton } from '@/features/products/product-card';

export default function Loading() {
  return (
    <div className="container-page py-10">
      <div className="skeleton mb-4 h-3 w-40" />
      <div className="skeleton mb-10 h-10 w-72" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-7" />
          ))}
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
