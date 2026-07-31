import assert from "node:assert/strict";
import test from "node:test";
import {
  getCatalogBatchSize,
  getNextCatalogLimit,
  getVisibleCatalogCount,
  getVisibleCatalogItems,
  resetCatalogLimit,
} from "../../../lib/signals/catalog-pagination.ts";

test("calcula lote por breakpoint", () => {
  assert.equal(getCatalogBatchSize(360), 12);
  assert.equal(getCatalogBatchSize(768), 18);
  assert.equal(getCatalogBatchSize(1366), 24);
});

test("reseta o limite ao lote inicial depois de filtrar", () => {
  assert.equal(resetCatalogLimit(24, 80), 24);
  assert.equal(resetCatalogLimit(18, 7), 7);
});

test("calcula contagem visível e limita ao total", () => {
  assert.equal(getVisibleCatalogCount(24, 100), 24);
  assert.equal(getVisibleCatalogCount(48, 20), 20);
  assert.equal(getVisibleCatalogCount(12, 0), 0);
  assert.equal(getNextCatalogLimit(24, 24, 40), 40);
});

test("retorna somente itens visíveis sem duplicar", () => {
  assert.deepEqual(getVisibleCatalogItems([1, 2, 3, 4], 2), [1, 2]);
  assert.deepEqual(getVisibleCatalogItems([], 12), []);
});
