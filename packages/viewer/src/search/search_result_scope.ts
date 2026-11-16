/** Keep the map's full result set independent of the bounded detail list. */
export function splitSearchResults<T extends { id: string | number }>(results: T[], detailLimit: number) {
  const unique = [...new Map(results.map((item) => [item.id, item])).values()];
  return { allIds: unique.map((item) => item.id), details: unique.slice(0, detailLimit) };
}
