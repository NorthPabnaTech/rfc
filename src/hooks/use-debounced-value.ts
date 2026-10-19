'use client';

// hooks/useDebouncedValue.ts
import * as React from 'react';

/**
 * Returns a copy of `value` that only updates after `delay` ms of no changes.
 * Handy for search inputs: bind the input to the raw value, query with this one.
 *
 * @param value - the fast-changing value (e.g. an input's text)
 * @param delay - quiet period in ms before the debounced value catches up
 */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
