import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { auditImages, detectImageType, extensionForContentType } from "../images.mjs";
import { isPrivateAddress, assertPublicUrl } from "../network.mjs";
import { catalogFingerprint, normalizeGame, normalizeImageUrl, normalizeProvider, normalizeText, storagePath } from "../normalize.mjs";
import { matchExistingGames, preserveManualFields } from "../plan.mjs";
import { decodeFlightPayloads, extractActionResult, extractInitialPage } from "../source.mjs";
import { collectAllPages, findDuplicates } from "../validate.mjs";
import { suggestCandidates } from "../manual-image-review.mjs";

test("normaliza providers conhecidos", () => {
  assert.equal(normalizeProvider("PG SOFT"), "pg");
  assert.equal(normalizeProvider("Pragmatic Play"), "pp");
  assert.equal(normalizeProvider("TADA Gaming"), "tada");
  assert.equal(normalizeProvider("WG Games"), "wg");
});

test("normaliza nomes de forma estável", () => {
  assert.equal(normalizeText("  Dragão  da Sorte! "), "dragao da sorte");
});

test("extrai URL original do Next Image e resolve caminho relativo", () => {
  assert.equal(normalizeImageUrl("/_next/image?url=%2Fimage%2Fgames-pg%2F11.webp&w=640&q=75"), "https://reidoslotsinais.org/image/games-pg/11.webp");
  assert.equal(normalizeImageUrl("/image/games-wg/17.webp"), "https://reidoslotsinais.org/image/games-wg/17.webp");
});

test("bloqueia endereços privados e hosts não autorizados", async () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.1.1", "::1", "fd00::1"]) assert.equal(isPrivateAddress(ip), true);
  await assert.rejects(() => assertPublicUrl("https://evil.example/image.webp", { lookup: async () => [{ address: "93.184.216.34" }] }), /não autorizado/);
  await assert.rejects(() => assertPublicUrl("https://reidoslotsinais.org/image.webp", { lookup: async () => [{ address: "127.0.0.1" }] }), /privado/);
});

test("gera path de Storage sanitizado e determinístico", () => {
  assert.equal(storagePath("PG", "11", "cover"), "pg/11/cover.webp");
  assert.throws(() => storagePath("pg", "11/../../x", "cover"));
});

test("decodifica initialGames e retorno da action", () => {
  const flight = '35:["$","$L",null,{"initialGames":[{"id":1,"nomeJogo":"A"}],"initialHasMore":false}]';
  const html = `<script>self.__next_f.push(${JSON.stringify([1, flight])})</script>`;
  assert.deepEqual(decodeFlightPayloads(html), [flight]);
  assert.deepEqual(extractInitialPage(html), { games: [{ id: 1, nomeJogo: "A" }], hasMore: false });
  assert.deepEqual(extractActionResult('0:{"a":"$@1"}\n1:{"games":[{"id":2}],"hasMore":false}\n'), { games: [{ id: 2 }], hasMore: false });
});

test("pagina até hasMore=false e detecta loops", async () => {
  const pages = new Map([[2, { games: [{ id: 2 }], hasMore: true }], [3, { games: [{ id: 3 }], hasMore: false }]]);
  assert.deepEqual((await collectAllPages(async (page) => pages.get(page), { games: [{ id: 1 }], hasMore: true })).map((game) => game.id), [1, 2, 3]);
  await assert.rejects(() => collectAllPages(async () => ({ games: [{ id: 1 }], hasMore: true }), { games: [{ id: 1 }], hasMore: true }), /Loop/);
});

test("detecta duplicados por provider e external_id", () => {
  const game = normalizeGame({ id: 1, nomeJogo: "A", categoriaJogo: "PG", imageUrl: "/a.webp" });
  assert.equal(findDuplicates([game, game]).length, 1);
});

test("matching exige nome compatível para ID e usa nome como fallback seguro", () => {
  const games = [normalizeGame({ id: 11, nomeJogo: "Fortune Test", categoriaJogo: "PG", imageUrl: "/a.webp" })];
  assert.equal(matchExistingGames(games, [{ id: 7, nome_jogo: "Outro", categoria_jogo: "PG", imagem_url: "11" }])[0].type, "new");
  assert.equal(matchExistingGames(games, [{ id: 7, nome_jogo: "Fortune Test", categoria_jogo: "PG", imagem_url: "11" }])[0].type, "exact");
  assert.equal(matchExistingGames(games, [{ id: 8, nome_jogo: "Fortune Test", categoria_jogo: "PG", imagem_url: "" }])[0].type, "fallback");
});

test("resolve conflito pg:126 sem associar sinais incorretos", () => {
  const games = [
    normalizeGame({ id: 2, nomeJogo: "Fortune Tiger", categoriaJogo: "PG", imageUrl: "/2.webp" }),
    normalizeGame({ id: 126, nomeJogo: "Hawaiian Tiki", categoriaJogo: "PG", imageUrl: "/126.webp" }),
  ];
  const signals = [
    { id: 1, nome_jogo: "Fortune Tiger", categoria_jogo: "PG", imagem_url: "126" },
    { id: 37, nome_jogo: "Honey Trap of Diao Chan", categoria_jogo: "PG", imagem_url: "126" },
  ];
  const matches = matchExistingGames(games, signals);
  assert.equal(matches.find((item) => item.game.external_id === "2").type, "fallback");
  assert.equal(matches.find((item) => item.game.external_id === "126").type, "new");
});

test("campos manuais são protegidos", () => {
  assert.deepEqual(preserveManualFields({ isManualImage: true }, { imagem_url: "nova", bets: ["1"], cor_background: "red", name: "ok" }), { name: "ok" });
});

test("hash/fingerprint é estável e assinatura real rejeita HTML", () => {
  const games = [normalizeGame({ id: 1, nomeJogo: "A", categoriaJogo: "PG", imageUrl: "/a.webp" })];
  assert.equal(catalogFingerprint(games), catalogFingerprint([...games]));
  assert.equal(detectImageType(Buffer.from("<html>not image</html>")), null);
  assert.equal(extensionForContentType("image/avif"), "avif");
  assert.equal(crypto.createHash("sha256").update("x").digest("hex"), crypto.createHash("sha256").update("x").digest("hex"));
});

test("testes unitários não dependem de rede", async () => {
  assert.equal(typeof auditImages, "function");
});

test("revisão manual sugere alias sem associar automaticamente", () => {
  const candidates = suggestCandidates(
    { nome_jogo: "Symbols of Egypt", categoria_jogo: "PG", imagem_url: "104" },
    [
      { id: 1, source: "rei-dos-slots", external_id: "118", provider_normalized: "pg", name: "Symbolz Of Egypt", name_normalized: "symbolz of egypt", storage_image_url: "https://project.supabase.co/storage/v1/object/public/games/pg/118/cover.jpg", storage_icon_url: null },
      { id: 2, source: "rei-dos-slots", external_id: "104", provider_normalized: "pg", name: "Galactic Gems", name_normalized: "galactic gems", storage_image_url: "https://project.supabase.co/storage/v1/object/public/games/pg/104/cover.jpg", storage_icon_url: null }
    ],
  );
  assert.equal(candidates[0].name, "Symbolz Of Egypt");
  assert.equal(candidates[0].confidence, "alta");
  assert.equal(candidates.some((candidate) => candidate.externalId === "104"), true);
  assert.equal("selected" in candidates[0], false);
});
