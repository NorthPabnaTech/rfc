export default function TrackOrderLoading() {
  return (
    <div className="container-page max-w-3xl py-14" aria-busy="true" aria-label="Loading">
      <div className="text-center">
        <div className="skeleton mx-auto h-3 w-28" />
        <div className="skeleton mx-auto mt-2.5 h-10 w-72" />
        <div className="skeleton mx-auto mt-3 h-4 w-80 max-w-full" />
      </div>

      <div className="bg-cream mt-10 grid gap-4 rounded-3xl p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-24" />
          <div className="skeleton h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-24" />
          <div className="skeleton h-11 rounded-xl" />
        </div>
        <div className="skeleton h-11 w-full rounded-full sm:w-32" />
      </div>
    </div>
  );
}
