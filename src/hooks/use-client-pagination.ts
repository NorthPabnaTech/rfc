'use client';

import * as React from 'react';

import { ADMIN_PAGE_SIZE } from '@lib/constants';

/**
 * Pages an already-loaded list in the browser, for small admin lists that
 * aren't paginated on the server. Spread the result into `<DataTable>`.
 * The page is clamped, so deleting the last row of the last page steps back.
 */
export function useClientPagination<T>(rows: T[], pageSize = ADMIN_PAGE_SIZE) {
  const [page, setPage] = React.useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);

  return {
    source: rows.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    limit: pageSize,
    total: rows.length,
    onPaginate: setPage,
  };
}
