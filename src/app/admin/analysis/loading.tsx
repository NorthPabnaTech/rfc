import { AdminPageHeaderSkeleton, AdminStatGridSkeleton } from '../_components/admin-skeletons';

export default function AnalysisLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton actionCount={2} />
      <AdminStatGridSkeleton count={4} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-4 p-5">
            <div className="space-y-1.5">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-3.5 w-64" />
            </div>
            <div className="skeleton h-64 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
