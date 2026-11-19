export function AdminPageHeaderSkeleton({
  hasBack = false,
  actionCount = 0,
  hasAvatar = false,
}: {
  hasBack?: boolean;
  actionCount?: number;
  hasAvatar?: boolean;
}) {
  return (
    <div className="mb-6">
      {hasBack && <div className="skeleton mb-3 h-4 w-28" />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {hasAvatar && <div className="skeleton size-11 shrink-0 rounded-full" />}
          <div className="space-y-2">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-72 max-w-full" />
          </div>
        </div>
        {actionCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: actionCount }).map((_, i) => (
              <div key={i} className="skeleton h-9 w-32 rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminStatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-panel hairline rounded-xl2 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-7 w-24" />
            </div>
            <div className="skeleton size-9 shrink-0 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminToolbarSkeleton({
  hasSearch = true,
  filterCount = 0,
}: {
  hasSearch?: boolean;
  filterCount?: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
      {hasSearch ? <div className="skeleton h-9 w-full rounded-lg sm:w-72" /> : <div />}
      {filterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: filterCount }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-32 rounded-lg" />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminTableSkeleton({
  columns = 6,
  rows = 8,
  hasThumb = false,
}: {
  columns?: number;
  rows?: number;
  hasThumb?: boolean;
}) {
  return (
    <div className="bg-panel hairline rounded-xl2 overflow-hidden">
      <div className="border-line flex items-center gap-4 border-b px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton h-3 flex-1" />
        ))}
      </div>
      <div className="divide-line divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, c) =>
              c === 0 && hasThumb ? (
                <div key={c} className="flex flex-[1.5] items-center gap-3">
                  <div className="skeleton size-10 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ) : (
                <div key={c} className="skeleton h-3.5 flex-1" />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="border-line flex items-center justify-between border-t px-4 py-3">
        <div className="skeleton h-3.5 w-36" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-lg" />
          <div className="skeleton h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function AdminTwoColFormSkeleton({
  leftPanels = 4,
  rightPanels = 2,
}: {
  leftPanels?: number;
  rightPanels?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {Array.from({ length: leftPanels }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-4 p-5">
            <div className="skeleton h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="skeleton h-10 rounded-lg" />
              <div className="skeleton h-10 rounded-lg" />
            </div>
            <div className="skeleton h-20 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="space-y-6">
        {Array.from({ length: rightPanels }).map((_, i) => (
          <div key={i} className="bg-panel hairline rounded-xl2 space-y-3 p-5">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
