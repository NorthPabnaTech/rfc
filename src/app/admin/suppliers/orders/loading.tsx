import {
  AdminPageHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from '../../_components/admin-skeletons';

export default function SupplierOrdersLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack />
      <AdminToolbarSkeleton hasSearch filterCount={2} />
      <AdminTableSkeleton columns={6} rows={8} />
    </div>
  );
}
