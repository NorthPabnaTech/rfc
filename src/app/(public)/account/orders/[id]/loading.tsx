export default function AccountOrderDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-24" />

      <div className="border-line rounded-3xl border bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-7 w-40" />
            <div className="skeleton h-4 w-52" />
          </div>
          <div className="skeleton h-7 w-24 rounded-full" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 sm:flex-col">
              <div className="skeleton size-8 rounded-full" />
              <div className="skeleton h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border-line rounded-3xl border bg-white p-6 sm:p-8">
          <div className="skeleton mb-4 h-5 w-20" />
          <div className="divide-line divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4">
                <div className="skeleton size-16 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-line space-y-3 rounded-3xl border bg-white p-6">
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-5 w-full" />
          </div>
          <div className="border-line space-y-2.5 rounded-3xl border bg-white p-6">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-4 w-3/5" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
