import { AdminPageHeaderSkeleton } from '../_components/admin-skeletons';

export default function TagsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="bg-panel hairline rounded-xl2 h-fit space-y-4 p-5">
          <div className="skeleton h-5 w-28" />
          <div className="skeleton h-10 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
        <div className="bg-panel hairline rounded-xl2 space-y-4 p-5">
          <div className="skeleton h-5 w-24" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="skeleton h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
