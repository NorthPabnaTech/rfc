export default function AccountProfileLoading() {
  return (
    <section
      className="border-line rounded-3xl border bg-white p-6 sm:p-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="skeleton h-6 w-36" />
      <div className="skeleton mt-2 h-4 w-64" />

      <div className="mt-6 space-y-6">
        <div className="flex items-center gap-5">
          <div className="skeleton size-20 shrink-0 rounded-full" />
          <div className="skeleton h-10 w-36 rounded-full" />
        </div>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl sm:col-span-2" />
        </div>
        <div className="skeleton h-11 w-36 rounded-full" />
      </div>
    </section>
  );
}
