import { AdminPageHeaderSkeleton } from '../_components/admin-skeletons';

export default function BusinessesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <div className="mb-4 flex justify-end">
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="skeleton size-12 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-4 w-36" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-2/3" />
            </div>
            <div className="border-line flex items-center justify-between border-t pt-3">
              <div className="skeleton h-3.5 w-32" />
              <div className="skeleton h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
