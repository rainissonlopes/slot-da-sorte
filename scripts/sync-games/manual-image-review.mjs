import fs from "node:fs";
import path from "node:path";
import { REPORT_DIR, loadEnv } from "./config.mjs";
import { normalizeProvider, normalizeText } from "./normalize.mjs";
import { createReadClient } from "./supabase.mjs";

export const PENDING_SIGNAL_NAMES = [
  "Muay Thai", "Rave Party Fever", "Fruity Candy", "Roost Rumble", "The Great Icescape",
  "Secrets of Cleopatra", "Medusa", "Symbols of Egypt", "Egypt's Book of Mystery",
  "Thai River Wonders", "Hip Hop Panda", "Destiny of Sun & Moon", "Medusa 2",
  "Ninja vs Samurai", "Genies 3 Wishes", "Super Market", "Sugar Hush", "Dragon Tiger",
  "Win Win Fish Prawn Crab", "Captain's Bounty", "Lucky Clover Lady",
];

const KNOWN_ALIASES = new Map([
  ["symbols of egypt", ["symbolz of egypt"]],
  ["thai river wonders", ["thai rivers wonders"]],
  ["ninja vs samurai", ["ninja vs samuray"]],
  ["win win fish prawn crab", ["win win fish prawh crab"]],
]);

function singularize(token) {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokens(value) { return normalizeText(value).split(" ").filter(Boolean).map(singularize); }

function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0]; previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (left[row - 1] === right[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[right.length];
}

function similarity(left, right) {
  const a = normalizeText(left); const b = normalizeText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const leftTokens = new Set(tokens(a)); const rightTokens = new Set(tokens(b));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenScore = intersection / (new Set([...leftTokens, ...rightTokens]).size || 1);
  const editScore = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const reordered = [...leftTokens].sort().join(" ") === [...rightTokens].sort().join(" ");
  return Math.max(tokenScore, editScore, reordered ? 0.92 : 0);
}

export function suggestCandidates(signal, games, limit = 5) {
  const providerNormalized = normalizeProvider(signal.categoria_jogo);
  const signalNormalized = normalizeText(signal.nome_jogo);
  const aliases = new Set(KNOWN_ALIASES.get(signalNormalized) ?? []);
  const legacyExternalId = /^\d+$/.test(String(signal.imagem_url ?? "").trim()) ? String(signal.imagem_url).trim() : null;
  return games.filter((game) => game.provider_normalized === providerNormalized).map((game) => {
    const exact = game.name_normalized === signalNormalized;
    const alias = aliases.has(game.name_normalized);
    const legacyId = legacyExternalId === String(game.external_id);
    const textScore = similarity(signalNormalized, game.name_normalized);
    const score = exact ? 1 : alias ? 0.96 : Math.max(textScore, legacyId ? 0.35 : 0);
    const reasons = [];
    if (exact) reasons.push("nome normalizado exato");
    if (alias) reasons.push("alias conhecido");
    if (!exact && !alias && textScore >= 0.42) reasons.push("similaridade textual para revisão");
    if (legacyId) reasons.push("external_id legado (não confirma identidade)");
    if (!reasons.length || score < 0.35) return null;
    return { gameId: game.id, source: game.source, externalId: game.external_id, providerNormalized: game.provider_normalized, name: game.name, storageImageUrl: game.storage_image_url, storageIconUrl: game.storage_icon_url, score: Number(score.toFixed(4)), reason: reasons.join("; "), confidence: exact || alias || score > 0.92 ? "alta" : score >= 0.65 ? "média" : "baixa" };
  }).filter(Boolean).sort((left, right) => right.score - left.score || left.name.localeCompare(right.name)).slice(0, limit);
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }

function localPreviewSource(value) {
  return value === "/placeholder-game.webp" ? "../../public/placeholder-game.webp" : value;
}

function renderHtml(report) {
  const cards = report.records.map(({ signal, candidates, reviewStatus }) => `<section class="review-card"><div class="signal"><h2>${escapeHtml(signal.nome_jogo)}</h2><img src="${escapeHtml(localPreviewSource(signal.currentImagePreview))}" alt="Imagem atual de ${escapeHtml(signal.nome_jogo)}"><dl><dt>sinais.id</dt><dd>${signal.id}</dd><dt>categoria</dt><dd>${escapeHtml(signal.categoria_jogo)}</dd><dt>provider</dt><dd>${escapeHtml(signal.providerNormalized)}</dd><dt>imagem_url</dt><dd>${escapeHtml(signal.imagem_url)}</dd><dt>bets</dt><dd>${escapeHtml(JSON.stringify(signal.bets ?? []))}</dd><dt>created_at</dt><dd>${escapeHtml(signal.created_at ?? "não disponível")}</dd><dt>updated_at</dt><dd>${escapeHtml(signal.updated_at ?? "não disponível no schema")}</dd><dt>external_id legado</dt><dd>${escapeHtml(signal.legacyExternalId ?? "n/a")}</dd></dl></div><div class="candidates"><h3>${candidates.length ? `Candidatos (${candidates.length})` : "Sem correspondência"}</h3>${candidates.length ? candidates.map((candidate) => `<article class="candidate"><img src="${escapeHtml(localPreviewSource(candidate.storageImageUrl || candidate.storageIconUrl || "/placeholder-game.webp"))}" alt="${escapeHtml(candidate.name)}"><div><strong>${escapeHtml(candidate.name)}</strong><p>${escapeHtml(candidate.providerNormalized)} · external_id ${escapeHtml(candidate.externalId)}</p><p>Score ${candidate.score} · confiança ${escapeHtml(candidate.confidence)}</p><p>${escapeHtml(candidate.reason)}</p></div></article>`).join("") : `<p class="empty">Manter placeholder. Recomenda-se adicionar o jogo manualmente em public.games e enviar cover/icon próprios.</p>`}</div><span class="status">${escapeHtml(reviewStatus)}</span></section>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão manual de imagens</title><style>body{margin:0;background:#090b0a;color:#f4f7f5;font:14px system-ui;padding:24px}main{max-width:1280px;margin:auto}.review-card{position:relative;display:grid;grid-template-columns:minmax(240px,1fr) 2fr;gap:20px;background:#121714;border:1px solid #263029;border-radius:16px;padding:18px;margin:16px 0}.signal>img{width:180px;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#222}dl{display:grid;grid-template-columns:max-content 1fr;gap:5px 10px}dt{color:#93a499}dd{margin:0;overflow-wrap:anywhere}.candidate{display:grid;grid-template-columns:120px 1fr;gap:14px;border-top:1px solid #28332c;padding:12px 0}.candidate img{width:120px;aspect-ratio:4/3;object-fit:cover;border-radius:10px}.candidate p{margin:5px 0;color:#b8c4bc}.status{position:absolute;right:16px;top:14px;color:#f6c453}.empty{padding:20px;background:#281f13;border-radius:10px}@media(max-width:760px){body{padding:10px}.review-card{grid-template-columns:1fr}.signal>img{width:100%}}</style></head><body><main><header><h1>Revisão manual assistida — imagens</h1><p>Relatório estático, somente leitura. Nenhuma associação foi aplicada.</p><p>${report.summary.totalSignals} sinais · ${report.summary.highConfidence} com sugestão alta · ${report.summary.noCandidates} sem candidato</p></header>${cards}</main></body></html>`;
}

export async function generateManualImageReview(env = loadEnv()) {
  const { client } = createReadClient(env);
  const [{ data: signals, error: signalsError }, { data: games, error: gamesError }] = await Promise.all([
    client.from("sinais").select("*").in("nome_jogo", PENDING_SIGNAL_NAMES).order("id"),
    client.from("games").select("id,source,external_id,provider_normalized,name,name_normalized,storage_image_url,storage_icon_url").eq("source", "rei-dos-slots").limit(1000),
  ]);
  if (signalsError) throw signalsError;
  if (gamesError) throw gamesError;
  if ((signals ?? []).length !== PENDING_SIGNAL_NAMES.length) throw new Error(`Esperados ${PENDING_SIGNAL_NAMES.length} sinais pendentes; encontrados ${signals?.length ?? 0}`);
  const records = (signals ?? []).map((row) => {
    const candidates = suggestCandidates(row, games ?? []);
    const legacyExternalId = /^\d+$/.test(String(row.imagem_url ?? "").trim()) ? String(row.imagem_url).trim() : null;
    const standardFields = new Set(["id", "nome_jogo", "categoria_jogo", "imagem_url", "bets", "created_at", "updated_at", "provider", "external_id"]);
    return { signal: { ...row, provider: row.provider ?? null, providerNormalized: normalizeProvider(row.categoria_jogo), updated_at: row.updated_at ?? null, legacyExternalId: row.external_id ?? legacyExternalId, technicalOriginFields: Object.fromEntries(Object.entries(row).filter(([key]) => !standardFields.has(key))), currentImagePreview: /^https?:\/\//.test(String(row.imagem_url ?? "")) || String(row.imagem_url ?? "").startsWith("/") ? row.imagem_url : "/placeholder-game.webp" }, candidates, reviewStatus: candidates.length ? "revisão manual pendente" : "sem correspondência" };
  });
  const report = { generatedAt: new Date().toISOString(), mode: "read-only-assisted-review", remoteWrites: 0, summary: { totalSignals: records.length, highConfidence: records.filter((record) => record.candidates.some((candidate) => candidate.confidence === "alta")).length, mediumOrLowOnly: records.filter((record) => record.candidates.length && !record.candidates.some((candidate) => candidate.confidence === "alta")).length, noCandidates: records.filter((record) => !record.candidates.length).length }, records };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const jsonPath = path.join(REPORT_DIR, "manual-image-review.json"); const textPath = path.join(REPORT_DIR, "manual-image-review.txt"); const htmlPath = path.join(REPORT_DIR, "manual-image-review.html");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`); fs.writeFileSync(htmlPath, renderHtml(report));
  const lines = ["Slot da Sorte — revisão manual assistida", `Gerado em: ${report.generatedAt}`, "Escritas remotas: ZERO", JSON.stringify(report.summary), "", ...records.flatMap(({ signal, candidates, reviewStatus }) => [`[sinal ${signal.id}] ${signal.nome_jogo} (${signal.providerNormalized}) — ${reviewStatus}`, ...candidates.map((candidate) => `  - game ${candidate.gameId}: ${candidate.name} [${candidate.confidence} ${candidate.score}] ${candidate.reason}`), ""])];
  fs.writeFileSync(textPath, `${lines.join("\n")}\n`);
  return { report, paths: { jsonPath, textPath, htmlPath } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try { const result = await generateManualImageReview(); console.log(JSON.stringify({ summary: result.report.summary, paths: result.paths }, null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
