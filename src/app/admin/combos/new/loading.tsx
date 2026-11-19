import {
  AdminPageHeaderSkeleton,
  AdminTwoColFormSkeleton,
} from '../../_components/admin-skeletons';

export default function NewComboLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack />
      <AdminTwoColFormSkeleton leftPanels={3} rightPanels={2} />
    </div>
  );
}
