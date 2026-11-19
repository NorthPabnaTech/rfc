import {
  AdminPageHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from '../_components/admin-skeletons';

export default function ProductsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton actionCount={1} />
      <AdminToolbarSkeleton hasSearch filterCount={6} />
      <AdminTableSkeleton columns={8} rows={8} hasThumb />
    </div>
  );
}
