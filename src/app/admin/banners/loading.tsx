import { AdminPageHeaderSkeleton } from '../_components/admin-skeletons';

export default function BannersLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <div className="mb-4 flex justify-end">
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i} className="bg-panel hairline rounded-xl2 space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-3.5 w-64" />
              </div>
              <div className="skeleton h-8 w-20 rounded-lg" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 2 }).map((__, j) => (
                <div key={j} className="border-line space-y-3 rounded-xl border p-3">
                  <div className="skeleton aspect-[5/2] rounded-lg" />
                  <div className="flex items-center justify-between">
                    <div className="skeleton h-4 w-28" />
                    <div className="skeleton h-6 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
