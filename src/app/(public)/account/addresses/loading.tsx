export default function AccountAddressesLoading() {
  return (
    <section
      className="border-line rounded-3xl border bg-white p-6 sm:p-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-10 w-32 rounded-full" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border-line space-y-3 rounded-2xl border p-5">
            <div className="flex items-center justify-between">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-1/2" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="skeleton h-8 w-16 rounded-full" />
              <div className="skeleton h-8 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
