import {
  AdminPageHeaderSkeleton,
  AdminStatGridSkeleton,
  AdminTableSkeleton,
} from '../_components/admin-skeletons';

export default function CampaignsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton actionCount={1} />
      <AdminStatGridSkeleton count={4} />
      <AdminTableSkeleton columns={7} rows={6} />
    </div>
  );
}
