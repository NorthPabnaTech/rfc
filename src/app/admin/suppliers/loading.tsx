import { AdminPageHeaderSkeleton, AdminTableSkeleton } from '../_components/admin-skeletons';

export default function SuppliersLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="skeleton h-5 w-32" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-32 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>
      <AdminTableSkeleton columns={6} rows={6} />
    </div>
  );
}
