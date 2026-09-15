import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseUrlQuerySyncOptions<Q> {
  query: Q;
  page: number;
  pageSize: number;
  setPagination: (page: number, pageSize: number) => void;
  setQuery: (query: Partial<Q>) => void;
  // Optional flag to skip synchronization if needed
  enabled?: boolean;
}

const legacyCommaJoinedDateRangePattern = /^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/;

function isLegacyCommaJoinedDateRange(value: string) {
  return legacyCommaJoinedDateRangePattern.test(value);
}

function hasSameValues(currentValues: string[], nextValues: string[]) {
  return currentValues.length === nextValues.length
    && currentValues.every((value, index) => value === nextValues[index]);
}

/**
 * A shared hook to synchronize a Zustand List Query store with React Router's URL search parameters.
 * 
 * Flow:
 * 1. On Mount: Hydrates the Zustand store from the URL (if URL has params).
 * 2. On Change: Updates the URL whenever the Zustand store (query, page, pageSize) changes.
 */
export function useUrlQuerySync<Q extends Record<string, any>>({
  query,
  page,
  pageSize,
  setPagination,
  setQuery,
  enabled = true,
}: UseUrlQuerySyncOptions<Q>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isHydrated = useRef(false);

  // Hydrate Store from URL on initial load
  useEffect(() => {
    if (!enabled || isHydrated.current) return;

    let hasUrlParams = false;
    const initialQuery: Record<string, any> = {};
    let initialPage = page;
    let initialPageSize = pageSize;

    // Parse URL params. Repeated keys represent array query values.
    Array.from(new Set(searchParams.keys())).forEach((key) => {
      hasUrlParams = true;
      const values = searchParams.getAll(key);
      const value = values[0];

      if (key === 'page') {
        initialPage = parseInt(value, 10) || page;
      } else if (key === 'pageSize') {
        initialPageSize = parseInt(value, 10) || pageSize;
      } else if (values.length > 1) {
        initialQuery[key] = values;
      } else if (isLegacyCommaJoinedDateRange(value)) {
        // Historical array values were serialized with String(array). Do not pass them to the API.
        return;
      } else {
        // Handle boolean conversions
        if (value === 'true') initialQuery[key] = true;
        else if (value === 'false') initialQuery[key] = false;
        else initialQuery[key] = value;
      }
    });

    if (hasUrlParams) {
      setQuery(initialQuery as Partial<Q>);
      setPagination(initialPage, initialPageSize);
    }
    
    isHydrated.current = true;
  }, [searchParams, setQuery, setPagination, page, pageSize, enabled]);

  // Sync Store back to URL whenever store changes
  useEffect(() => {
    if (!enabled || !isHydrated.current) return;

    const currentParams = new URLSearchParams(searchParams);
    let needsUpdate = false;

    // Check page
    if (String(page) !== currentParams.get('page')) {
      currentParams.set('page', String(page));
      needsUpdate = true;
    }

    // Check pageSize
    if (String(pageSize) !== currentParams.get('pageSize')) {
      currentParams.set('pageSize', String(pageSize));
      needsUpdate = true;
    }

    // Check query fields
    Object.keys(query).forEach((key) => {
      const value = query[key];
      if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
        const nextValues = Array.isArray(value) ? value.map(String) : [String(value)];
        if (!hasSameValues(currentParams.getAll(key), nextValues)) {
          currentParams.delete(key);
          nextValues.forEach((nextValue) => currentParams.append(key, nextValue));
          needsUpdate = true;
        }
      } else if (currentParams.has(key)) {
        // Remove undefined/null/empty keys from URL
        currentParams.delete(key);
        needsUpdate = true;
      }
    });

    // Check if URL has stale keys that are no longer in the store
    Array.from(new Set(currentParams.keys())).forEach((key) => {
      if (key !== 'page' && key !== 'pageSize') {
        if (!(key in query)) {
          currentParams.delete(key);
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      setSearchParams(currentParams, { replace: true });
    }
  }, [query, page, pageSize, searchParams, setSearchParams, enabled]);
}