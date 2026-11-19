export default function AccountPasswordLoading() {
  return (
    <section
      className="border-line rounded-3xl border bg-white p-6 sm:p-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="skeleton h-6 w-44" />
      <div className="skeleton mt-2 h-4 w-64" />

      <div className="mt-6 max-w-md space-y-4">
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-11 w-40 rounded-full" />
      </div>
    </section>
  );
}
