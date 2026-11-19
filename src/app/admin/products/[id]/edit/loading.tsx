import {
  AdminPageHeaderSkeleton,
  AdminTwoColFormSkeleton,
} from '../../../_components/admin-skeletons';

export default function EditProductLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack actionCount={1} />
      <AdminTwoColFormSkeleton leftPanels={6} rightPanels={3} />
    </div>
  );
}
