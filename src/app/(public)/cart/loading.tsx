export default function CartLoading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-8 h-10 w-44" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="divide-line border-line divide-y border-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-6 sm:gap-6">
              <div className="skeleton size-24 shrink-0 rounded-2xl sm:size-32" />
              <div className="flex flex-1 flex-col justify-between py-1">
                <div className="space-y-2">
                  <div className="skeleton h-5 w-3/5" />
                  <div className="skeleton h-3.5 w-28" />
                </div>
                <div className="flex items-center justify-between pt-3">
                  <div className="skeleton h-9 w-28 rounded-full" />
                  <div className="skeleton h-5 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-cream h-fit space-y-4 rounded-3xl p-6">
          <div className="skeleton h-6 w-36" />
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 w-16" />
            </div>
          </div>
          <div className="border-line flex justify-between border-t pt-4">
            <div className="skeleton h-5 w-16" />
            <div className="skeleton h-5 w-24" />
          </div>
          <div className="skeleton h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
