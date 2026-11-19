export default function OrderSuccessLoading() {
  return (
    <div className="container-page flex justify-center py-16" aria-busy="true" aria-label="Loading">
      <div className="w-full max-w-xl text-center">
        <div className="skeleton mx-auto size-20 rounded-full" />
        <div className="skeleton mx-auto mt-6 h-10 w-72" />
        <div className="skeleton mx-auto mt-3 h-4 w-80 max-w-full" />

        <div className="bg-cream mt-8 grid grid-cols-3 divide-x rounded-3xl py-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 px-3">
              <div className="skeleton h-3 w-14" />
              <div className="skeleton h-5 w-20" />
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <div className="skeleton h-12 w-40 rounded-full" />
          <div className="skeleton h-12 w-44 rounded-full" />
        </div>
      </div>
    </div>
  );
}
