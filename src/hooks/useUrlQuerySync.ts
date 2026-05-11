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

    // Parse URL params
    searchParams.forEach((value, key) => {
      hasUrlParams = true;
      if (key === 'page') {
        initialPage = parseInt(value, 10) || page;
      } else if (key === 'pageSize') {
        initialPageSize = parseInt(value, 10) || pageSize;
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

    const currentParams = Object.fromEntries(searchParams.entries());
    let needsUpdate = false;

    // Check page
    if (String(page) !== currentParams.page) {
      currentParams.page = String(page);
      needsUpdate = true;
    }

    // Check pageSize
    if (String(pageSize) !== currentParams.pageSize) {
      currentParams.pageSize = String(pageSize);
      needsUpdate = true;
    }

    // Check query fields
    Object.keys(query).forEach((key) => {
      const value = query[key];
      if (value !== undefined && value !== null && value !== '') {
        if (String(value) !== currentParams[key]) {
          currentParams[key] = String(value);
          needsUpdate = true;
        }
      } else if (currentParams[key] !== undefined) {
        // Remove undefined/null/empty keys from URL
        delete currentParams[key];
        needsUpdate = true;
      }
    });

    // Check if URL has stale keys that are no longer in the store
    Object.keys(currentParams).forEach((key) => {
      if (key !== 'page' && key !== 'pageSize') {
        if (!(key in query)) {
          delete currentParams[key];
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      setSearchParams(currentParams, { replace: true });
    }
  }, [query, page, pageSize, searchParams, setSearchParams, enabled]);
}