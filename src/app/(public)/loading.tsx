import { ProductGridSkeleton } from '@/features/products/product-card';

export default function StoreLoading() {
  return (
    <div className="bg-surface pb-12 sm:pb-16" aria-busy="true" aria-label="Loading">
      {/* Hero banners */}
      <section className="container-page pt-4 sm:pt-6">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="skeleton aspect-[16/10] rounded-2xl sm:aspect-[2/1] sm:rounded-3xl lg:aspect-auto lg:h-[420px]" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1 lg:grid-rows-2">
            <div className="skeleton aspect-[4/3] rounded-2xl sm:aspect-[2/1] sm:rounded-3xl lg:aspect-auto lg:h-full" />
            <div className="skeleton aspect-[4/3] rounded-2xl sm:aspect-[2/1] sm:rounded-3xl lg:aspect-auto lg:h-full" />
          </div>
        </div>
      </section>

      {/* Service strip */}
      <section className="container-page pt-3 sm:pt-4">
        <div className="border-line grid grid-cols-2 divide-y overflow-hidden rounded-2xl border bg-white lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5">
              <div className="skeleton size-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-24" />
                <div className="skeleton h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category rail */}
      <section className="container-page pt-8 sm:pt-10">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="skeleton size-10 rounded-xl" />
            <div className="space-y-1.5">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-3.5 w-52" />
            </div>
          </div>
          <div className="skeleton h-9 w-20 rounded-full" />
        </div>
        <div className="flex gap-3 overflow-hidden sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-line flex w-[108px] shrink-0 flex-col items-center gap-2.5 rounded-2xl border bg-white px-2 py-3 sm:w-[130px] lg:w-[140px]"
            >
              <div className="skeleton size-14 rounded-xl sm:size-16" />
              <div className="skeleton h-3.5 w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container-page pt-10 sm:pt-12">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="skeleton size-10 rounded-xl" />
            <div className="space-y-1.5">
              <div className="skeleton h-6 w-44" />
              <div className="skeleton h-3.5 w-56" />
            </div>
          </div>
          <div className="skeleton h-9 w-24 rounded-full" />
        </div>
        <ProductGridSkeleton count={5} />
      </section>

      {/* New arrivals */}
      <section className="container-page pt-10 sm:pt-12">
        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="skeleton size-10 rounded-xl" />
            <div className="space-y-1.5">
              <div className="skeleton h-6 w-36" />
              <div className="skeleton h-3.5 w-48" />
            </div>
          </div>
          <div className="skeleton h-9 w-24 rounded-full" />
        </div>
        <ProductGridSkeleton count={10} />
      </section>
    </div>
  );
}
