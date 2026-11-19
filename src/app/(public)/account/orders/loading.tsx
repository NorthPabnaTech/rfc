export default function AccountOrdersLoading() {
  return (
    <section
      className="border-line rounded-3xl border bg-white p-6 sm:p-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="skeleton h-6 w-36" />
      <div className="divide-line mt-4 divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
            <div className="min-w-[140px] space-y-1.5">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-3 w-20" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </section>
  );
}
