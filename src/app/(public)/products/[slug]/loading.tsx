import { ProductGridSkeleton } from '@/features/products/product-card';

export default function ProductDetailLoading() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="Loading">
      {/* Breadcrumb */}
      <div className="skeleton mb-6 h-3.5 w-56" />

      {/* Top gallery + purchase panel */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col-reverse gap-3 md:flex-row">
          <div className="flex gap-2.5 md:w-22 md:flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-square w-[72px] shrink-0 rounded-xl md:w-full" />
            ))}
          </div>
          <div className="skeleton aspect-square flex-1 rounded-3xl" />
        </div>

        <div className="lg:pt-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-2.5 h-9 w-4/5" />
          <div className="skeleton mt-3 h-4 w-44" />

          <div className="border-line mt-6 border-y py-5">
            <div className="skeleton h-8 w-40" />
          </div>

          <div className="mt-5 space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>

          <div className="mt-7 space-y-5">
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-9 w-20 rounded-full" />
              ))}
            </div>
            <div className="flex gap-3">
              <div className="skeleton h-12 w-32 rounded-full" />
              <div className="skeleton h-12 flex-1 rounded-full" />
              <div className="skeleton size-12 rounded-full" />
            </div>
            <div className="skeleton h-12 w-full rounded-full" />
            <div className="bg-cream grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
              <div className="skeleton h-10 rounded-xl" />
              <div className="skeleton h-10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <section className="mt-20">
        <div className="border-line flex gap-8 border-b pb-3.5">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-5 w-20" />
        </div>
        <div className="mt-8 max-w-3xl space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      </section>

      {/* Related products */}
      <section className="mt-16">
        <div className="skeleton mb-5 h-7 w-48" />
        <ProductGridSkeleton count={5} />
      </section>
    </div>
  );
}
