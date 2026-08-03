import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  formatCountdown,
  getCatalogBatchSize,
  getNextCatalogLimit,
  getVisibleCatalogCount,
  getVisibleCatalogItems,
  resetCatalogLimit,
} from "../../../lib/signals/catalog-pagination.ts";

test("formata o contador em MM:SS e protege valores invalidos", () => {
  assert.equal(formatCountdown(130), "02:10");
  assert.equal(formatCountdown(75), "01:15");
  assert.equal(formatCountdown(9), "00:09");
  assert.equal(formatCountdown(0), "00:00");
  assert.equal(formatCountdown(-10), "00:00");
  assert.equal(formatCountdown(Number.NaN), "00:00");
  assert.equal(formatCountdown(Number.POSITIVE_INFINITY), "00:00");
});

test("mantem o contador responsivo em 360px e alinhado a direita em 1366px", async () => {
  const home = await readFile(new URL("../../../app/page.tsx", import.meta.url), "utf8");

  assert.match(home, /w-full max-w-full[^"]*text-center[^"]*sm:w-auto[^"]*sm:max-w-md[^"]*sm:text-right/);
  assert.match(home, /Atualizado às[\s\S]*formatCountdown\(proximaAtualizacao\)/);
});

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
