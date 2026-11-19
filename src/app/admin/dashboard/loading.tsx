import { AdminPageHeaderSkeleton, AdminStatGridSkeleton } from '../_components/admin-skeletons';

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton actionCount={1} />
      <AdminStatGridSkeleton count={5} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="bg-panel hairline rounded-xl2 space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="skeleton h-5 w-36" />
              <div className="skeleton h-3.5 w-48" />
            </div>
            <div className="flex gap-4">
              <div className="skeleton h-8 w-24" />
              <div className="skeleton h-8 w-24" />
            </div>
          </div>
          <div className="skeleton h-64 rounded-xl" />
        </div>

        <div className="bg-panel hairline rounded-xl2 flex flex-col justify-between gap-4 p-5">
          <div className="space-y-2">
            <div className="skeleton h-4 w-36" />
            <div className="skeleton h-9 w-32" />
            <div className="skeleton h-3.5 w-44" />
          </div>
          <div className="space-y-2.5">
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-3 p-5">
            <div className="skeleton h-5 w-36" />
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="skeleton h-8 rounded-lg" />
            ))}
          </div>
        ))}
      </div>

      <div className="bg-panel hairline rounded-xl2 mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-4 w-16" />
        </div>
        <div className="divide-line divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-3">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
