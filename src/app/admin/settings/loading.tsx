import { AdminPageHeaderSkeleton } from '../_components/admin-skeletons';

export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <AdminPageHeaderSkeleton />
      <div className="grid max-w-4xl gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-4 p-5">
            <div className="skeleton h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="skeleton h-10 rounded-lg" />
              <div className="skeleton h-10 rounded-lg" />
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
