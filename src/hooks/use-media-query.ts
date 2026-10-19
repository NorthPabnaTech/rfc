'use client';

import * as React from 'react';

/** Subscribe to a CSS media query. SSR-safe (returns false on the server). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True on viewports below the `md` breakpoint (768px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
