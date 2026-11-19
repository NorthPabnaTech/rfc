import { AdminPageHeaderSkeleton, AdminTableSkeleton } from '../_components/admin-skeletons';

export default function CombosLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton actionCount={1} />
      <AdminTableSkeleton columns={7} rows={6} hasThumb />
    </div>
  );
}
