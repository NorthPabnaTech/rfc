export default function CheckoutLoading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-44" />
      <div className="skeleton mt-2 h-4 w-64" />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-8">
          {/* Step 1 */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="skeleton size-8 rounded-full" />
              <div className="skeleton h-6 w-40" />
            </div>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="skeleton h-12 rounded-xl" />
              <div className="skeleton h-12 rounded-xl" />
              <div className="skeleton h-12 rounded-xl sm:col-span-2" />
              <div className="skeleton h-12 rounded-xl" />
              <div className="skeleton h-12 rounded-xl" />
            </div>
          </div>

          {/* Step 2 */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="skeleton size-8 rounded-full" />
              <div className="skeleton h-6 w-36" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="skeleton h-20 rounded-2xl" />
              <div className="skeleton h-20 rounded-2xl" />
            </div>
          </div>

          {/* Step 3 */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="skeleton size-8 rounded-full" />
              <div className="skeleton h-6 w-32" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="skeleton h-20 rounded-2xl" />
              <div className="skeleton h-20 rounded-2xl" />
            </div>
          </div>
        </div>

        <aside className="bg-cream h-fit space-y-4 rounded-3xl p-6">
          <div className="skeleton h-6 w-32" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton size-14 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
                <div className="skeleton h-4 w-14" />
              </div>
            ))}
          </div>
          <div className="skeleton h-11 w-full rounded-xl" />
          <div className="border-line space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <div className="skeleton h-5 w-16" />
              <div className="skeleton h-5 w-24" />
            </div>
          </div>
          <div className="skeleton mt-2 h-12 w-full rounded-full" />
        </aside>
      </div>
    </div>
  );
}
