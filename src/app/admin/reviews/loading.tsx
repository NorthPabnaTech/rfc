import { AdminPageHeaderSkeleton, AdminToolbarSkeleton } from '../_components/admin-skeletons';

export default function ReviewsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <AdminToolbarSkeleton hasSearch filterCount={2} />
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-20 rounded-lg" />
                <div className="skeleton h-8 w-20 rounded-lg" />
              </div>
            </div>
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
