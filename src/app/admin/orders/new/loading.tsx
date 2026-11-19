import {
  AdminPageHeaderSkeleton,
  AdminTwoColFormSkeleton,
} from '../../_components/admin-skeletons';

export default function NewOrderLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack />
      <AdminTwoColFormSkeleton leftPanels={4} rightPanels={1} />
    </div>
  );
}
