import {
  AdminPageHeaderSkeleton,
  AdminTwoColFormSkeleton,
} from '../../_components/admin-skeletons';

export default function NewProductLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton hasBack />
      <AdminTwoColFormSkeleton leftPanels={6} rightPanels={3} />
    </div>
  );
}
