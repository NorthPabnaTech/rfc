import { AdminPageHeaderSkeleton, AdminStatGridSkeleton } from '../../_components/admin-skeletons';

export default function CustomerDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack hasAvatar actionCount={1} />
      <AdminStatGridSkeleton count={4} />

      <div className="bg-panel hairline rounded-xl2 mb-6 space-y-4 p-5">
        <div className="skeleton h-5 w-36" />
        <div className="skeleton h-52 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="bg-panel hairline rounded-xl2 space-y-3 p-5">
          <div className="skeleton h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
        <div className="bg-panel hairline rounded-xl2 space-y-3 p-5">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton h-24 rounded-lg" />
          <div className="skeleton h-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
