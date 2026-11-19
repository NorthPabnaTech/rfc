import {
  AdminPageHeaderSkeleton,
  AdminStatGridSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from '../_components/admin-skeletons';

export default function CustomersLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <AdminStatGridSkeleton count={3} />
      <AdminToolbarSkeleton hasSearch filterCount={1} />
      <AdminTableSkeleton columns={8} rows={8} hasThumb />
    </div>
  );
}
