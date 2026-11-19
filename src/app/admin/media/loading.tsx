import { AdminPageHeaderSkeleton, AdminToolbarSkeleton } from '../_components/admin-skeletons';

export default function MediaLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <AdminToolbarSkeleton hasSearch filterCount={1} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton h-4 w-28" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-36 rounded-lg" />
          <div className="skeleton h-9 w-32 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 overflow-hidden p-2.5">
            <div className="skeleton aspect-square rounded-lg" />
            <div className="mt-2.5 space-y-1.5">
              <div className="skeleton h-3.5 w-4/5" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
