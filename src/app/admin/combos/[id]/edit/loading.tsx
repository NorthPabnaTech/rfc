import {
  AdminPageHeaderSkeleton,
  AdminTwoColFormSkeleton,
} from '../../../_components/admin-skeletons';

export default function EditComboLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack actionCount={1} />
      <AdminTwoColFormSkeleton leftPanels={3} rightPanels={2} />
    </div>
  );
}
