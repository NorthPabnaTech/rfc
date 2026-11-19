import {
  AdminPageHeaderSkeleton,
  AdminStatGridSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from '../_components/admin-skeletons';

export default function OrdersLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton actionCount={2} />
      <AdminStatGridSkeleton count={4} />
      <AdminToolbarSkeleton hasSearch filterCount={3} />
      <AdminTableSkeleton columns={7} rows={8} />
    </div>
  );
}
