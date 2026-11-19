export default function ReturnPolicyLoading() {
  return (
    <article className="container-page max-w-3xl py-14" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-64" />
      <div className="mt-8 space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-3/4" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2.5 pt-2">
            <div className="skeleton h-6 w-52" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>
        ))}
      </div>
    </article>
  );
}
