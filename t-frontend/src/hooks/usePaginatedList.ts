"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaginatedResponse } from "@/lib/apiClient";
import { toErrorMessage } from "@/lib/errorMessage";
import type { PageMeta } from "@/types/nutrition";

export type PageFetcher<TItem> = (page: number, limit: number) => Promise<PaginatedResponse<TItem>>;

export interface PaginatedList<TItem> {
  items: TItem[];
  pageMeta: PageMeta;
  loading: boolean;
  loadError: string | null;
  setPage: (page: number) => void;
  reload: () => void;
}

/**
 * One page at a time from any endpoint using the shared pagination envelope.
 * `fetchPage` must be stable across renders (a module-level function), or every
 * render would refetch.
 */
export function usePaginatedList<TItem>(
  fetchPage: PageFetcher<TItem>,
  pageSize: number,
  fallbackErrorMessage: string
): PaginatedList<TItem> {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TItem[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta>({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Paging quickly can resolve requests out of order; only the newest may write state.
  const latestRequestId = useRef(0);

  const fetchCurrentPage = useCallback(async () => {
    const requestId = ++latestRequestId.current;
    const isSuperseded = () => requestId !== latestRequestId.current;
    setLoading(true);

    try {
      const response = await fetchPage(page, pageSize);
      if (isSuperseded()) return;
      setItems(response.data ?? []);
      setPageMeta({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
      setLoadError(null);
    } catch (cause) {
      if (isSuperseded()) return;
      setLoadError(toErrorMessage(cause, fallbackErrorMessage));
    } finally {
      if (!isSuperseded()) setLoading(false);
    }
  }, [fetchPage, page, pageSize, fallbackErrorMessage]);

  useEffect(() => {
    // Every state write happens after an await; the lint rule cannot see past the call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCurrentPage();
  }, [fetchCurrentPage]);

  return { items, pageMeta, loading, loadError, setPage, reload: fetchCurrentPage };
}
