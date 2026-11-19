import {
  AdminPageHeaderSkeleton,
  AdminTableSkeleton,
  AdminToolbarSkeleton,
} from '../_components/admin-skeletons';

export default function ReturnsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <AdminToolbarSkeleton hasSearch={false} filterCount={1} />
      <AdminTableSkeleton columns={6} rows={6} />
    </div>
  );
}
