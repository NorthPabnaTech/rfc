export default function ContactLoading() {
  return (
    <div className="container-page max-w-4xl py-14" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-3 w-32" />
      <div className="skeleton mt-2.5 h-10 w-64" />
      <div className="mt-3 max-w-lg space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-4/5" />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-cream flex items-center gap-4 rounded-3xl p-6">
            <div className="skeleton size-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 w-44" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
