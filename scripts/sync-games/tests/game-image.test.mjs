import assert from "node:assert/strict";
import test from "node:test";
import {
  GAME_IMAGE_PLACEHOLDER,
  applyGameImageFallback,
  buildGameImageCandidates,
  resolveGameImage,
} from "../../../lib/signals/resolve-game-image.ts";

const cover = "https://project.supabase.co/storage/v1/object/public/games/pg/1/cover.webp";
const icon = "https://project.supabase.co/storage/v1/object/public/games/pg/1/icon.webp";

test("prioriza capa, ícone, imagem armazenada e placeholder", () => {
  assert.deepEqual(buildGameImageCandidates({ storageImageUrl: cover, storageIconUrl: icon, rawImageUrl: "/jogos/1.webp", gameId: 1 }), [cover, icon, "/jogos/1.webp", GAME_IMAGE_PLACEHOLDER]);
});

test("impede src numérico, vazio, undefined e null", () => {
  for (const rawImageUrl of ["1", "/1", "", undefined, null]) {
    assert.equal(resolveGameImage({ rawImageUrl, gameId: 1 }), GAME_IMAGE_PLACEHOLDER);
  }
});

test("usa ícone quando a capa não está disponível", () => {
  assert.equal(resolveGameImage({ storageIconUrl: icon, rawImageUrl: "1", gameId: 1 }), icon);
});

test("fallback troca diretamente para o placeholder uma única vez", () => {
  const image = { dataset: { gameImageCandidateIndex: "0" }, src: cover };
  const candidates = [cover, icon, GAME_IMAGE_PLACEHOLDER];
  applyGameImageFallback(image, candidates);
  assert.equal(image.src, GAME_IMAGE_PLACEHOLDER);
  assert.equal(image.dataset.gameImageFallbackComplete, "true");
  applyGameImageFallback(image, candidates);
  assert.equal(image.src, GAME_IMAGE_PLACEHOLDER);
  assert.equal(image.dataset.gameImageFallbackComplete, "true");
});
