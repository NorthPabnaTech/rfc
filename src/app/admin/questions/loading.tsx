import { AdminPageHeaderSkeleton, AdminToolbarSkeleton } from '../_components/admin-skeletons';

export default function QuestionsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <AdminToolbarSkeleton hasSearch={false} filterCount={1} />
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-4 w-36" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-20 rounded-lg" />
                <div className="skeleton h-8 w-20 rounded-lg" />
              </div>
            </div>
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
