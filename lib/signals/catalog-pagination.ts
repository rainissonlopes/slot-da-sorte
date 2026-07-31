export const MOBILE_CATALOG_BATCH = 12;
export const TABLET_CATALOG_BATCH = 18;
export const DESKTOP_CATALOG_BATCH = 24;

export function getCatalogBatchSize(viewportWidth: number) {
  if (viewportWidth >= 1024) return DESKTOP_CATALOG_BATCH;
  if (viewportWidth >= 640) return TABLET_CATALOG_BATCH;
  return MOBILE_CATALOG_BATCH;
}

export function getVisibleCatalogCount(limit: number, total: number) {
  return Math.min(Math.max(0, limit), Math.max(0, total));
}

export function resetCatalogLimit(batchSize: number, total: number) {
  return getVisibleCatalogCount(batchSize, total);
}

export function getNextCatalogLimit(current: number, batchSize: number, total: number) {
  return getVisibleCatalogCount(current + batchSize, total);
}

export function getVisibleCatalogItems<T>(items: T[], limit: number) {
  return items.slice(0, getVisibleCatalogCount(limit, items.length));
}
