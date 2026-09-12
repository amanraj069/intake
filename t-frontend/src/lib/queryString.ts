/** A value that can be sent as a query parameter, before it is stringified. */
type QueryValue = string | number | undefined | null;

/**
 * Builds a `?a=1&b=2` suffix, dropping empty values so an unset filter is
 * absent from the URL rather than sent as a blank string the API would reject.
 */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}
