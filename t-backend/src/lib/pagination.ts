/**
 * The pagination envelope every list endpoint in this app returns.
 * `data` carries the page of records; the rest describe where that page sits.
 */
export interface PaginatedResult<TItem> {
  data: TItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** The page selection a list request asks for, after validation has coerced it. */
export interface PaginationParams {
  page: number;
  limit: number;
}

export function toSkipCount({ page, limit }: PaginationParams): number {
  return (page - 1) * limit;
}

export function buildPaginatedResult<TItem>(
  data: TItem[],
  total: number,
  { page, limit }: PaginationParams
): PaginatedResult<TItem> {
  return {
    data,
    page,
    limit,
    total,
    // An empty collection still reports one page, so a client never has to
    // special-case "page 1 of 0" when rendering its page controls.
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
