export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-2 h-8 w-56" />
      <div className="skeleton mb-6 h-4 w-80" />
      <div className="mb-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[84px] rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-96 rounded-xl" />
    </div>
  );
}
