import {
  AdminPageHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from '../_components/admin-skeletons';

export default function ExpensesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <AdminToolbarSkeleton hasSearch filterCount={3} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton h-9 w-56 rounded-lg" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-36 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>
      <AdminTableSkeleton columns={7} rows={8} />
    </div>
  );
}
