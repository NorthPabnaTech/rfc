import { AdminPageHeaderSkeleton, AdminStatGridSkeleton } from '../../_components/admin-skeletons';

export default function SupplierDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack />
      <div className="space-y-6">
        <AdminStatGridSkeleton count={4} />
        <div className="bg-panel hairline flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
          <div className="skeleton h-4 w-72" />
          <div className="flex gap-2">
            <div className="skeleton h-9 w-36 rounded-lg" />
            <div className="skeleton h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-9 w-64 rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-panel hairline rounded-xl2 space-y-3 p-4">
              <div className="flex gap-3">
                <div className="skeleton size-16 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-4/5" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="skeleton h-10 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
