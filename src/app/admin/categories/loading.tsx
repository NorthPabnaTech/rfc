import { AdminPageHeaderSkeleton } from '../_components/admin-skeletons';

export default function CategoriesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <div className="mb-4 flex justify-end">
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-3 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="skeleton size-11 shrink-0 rounded-lg" />
                <div className="space-y-1.5">
                  <div className="skeleton h-4 w-36" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-28 rounded-lg" />
                <div className="skeleton size-8 rounded-lg" />
                <div className="skeleton size-8 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2 pl-10">
              <div className="skeleton h-10 rounded-lg" />
              <div className="skeleton h-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
