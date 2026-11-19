import { AdminPageHeaderSkeleton } from '../../_components/admin-skeletons';

export default function OrderDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack actionCount={2} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="bg-panel hairline rounded-xl2 space-y-4 p-5">
            <div className="skeleton h-5 w-32" />
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-lg" />
              ))}
            </div>
          </div>

          <div className="bg-panel hairline rounded-xl2 space-y-4 p-5">
            <div className="skeleton h-5 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton size-12 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-3/5" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
                <div className="skeleton h-4 w-20" />
              </div>
            ))}
          </div>

          <div className="bg-panel hairline rounded-xl2 space-y-3 p-5">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-20 rounded-lg" />
          </div>
        </div>

        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-panel hairline rounded-xl2 space-y-3 p-5">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
