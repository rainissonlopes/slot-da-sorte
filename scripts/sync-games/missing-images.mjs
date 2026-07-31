import fs from "node:fs";
import path from "node:path";
import { REPORT_DIR, ROOT, loadEnv } from "./config.mjs";
import { mapLimit } from "./images.mjs";
import { fetchWithPolicy } from "./network.mjs";
import { normalizeProvider, normalizeText } from "./normalize.mjs";
import { createAdminClient, inspectImportedGames } from "./supabase.mjs";

const PLACEHOLDER = "/placeholder-game.webp";
const LEGACY_PROVIDER_PATHS = { pg: "games-pg", pp: "games-pp", tada: "games-tada", wg: "games-wg" };

function identity(provider, name) {
  return `${provider}:${normalizeText(name)}`;
}

async function inspectHttpUrl(rawUrl, allowedHosts) {
  const value = String(rawUrl ?? "").trim();
  if (!value) return { url: value, valid: false, status: null, contentType: null, reason: "URL vazia" };
  if (/^\/?\d+$/.test(value)) return { url: value, valid: false, status: null, contentType: null, reason: "URL numérica" };
  if (value === PLACEHOLDER) {
    const exists = fs.existsSync(path.join(ROOT, "public", "placeholder-game.webp"));
    return { url: value, valid: exists, status: exists ? 200 : 404, contentType: "image/webp", reason: "placeholder local" };
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { url: value, valid: false, status: null, contentType: null, reason: "URL inválida ou caminho local desconhecido" };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { url: value, valid: false, status: null, contentType: null, reason: "protocolo não permitido" };
  }
  try {
    const { response, finalUrl } = await fetchWithPolicy(value, {
      allowlist: allowedHosts,
      fetchOptions: { method: "HEAD" },
    });
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase() || null;
    const valid = response.status === 200 && Boolean(contentType?.startsWith("image/"));
    return {
      url: value,
      finalUrl,
      valid,
      status: response.status,
      contentType,
      reason: valid ? null : response.status !== 200 ? `HTTP ${response.status}` : `Content-Type ${contentType || "ausente"}`,
    };
  } catch (error) {
    return { url: value, valid: false, status: null, contentType: null, reason: error instanceof Error ? error.message : String(error) };
  }
}

function recommendedAction({ match, cover, icon, current }) {
  if (cover?.valid) return "usar storage_image_url";
  if (icon?.valid) return "usar storage_icon_url temporariamente e recuperar a capa";
  if (current?.valid && current.url !== PLACEHOLDER) return "preservar imagem_url válida e recuperar mídia própria";
  if (match?.original_image_url) return "validar e importar original_image_url pelo sincronizador";
  if (match?.original_icon_url) return "validar e importar original_icon_url pelo sincronizador";
  return "manter placeholder e encaminhar para revisão manual";
}

export async function auditMissingImages(env = loadEnv()) {
  const { url, client } = createAdminClient(env);
  const [{ data: signals, error: signalsError }, games] = await Promise.all([
    client.from("sinais")
      .select("id,nome_jogo,categoria_jogo,imagem_url")
      .order("id")
      .limit(1000),
    inspectImportedGames(client),
  ]);
  if (signalsError) throw signalsError;

  const projectHost = new URL(url).hostname;
  const allowedHosts = [projectHost, "reidoslotsinais.org", "imagedelivery.net"];
  const legacyUrlForSignal = (signal) => {
    const raw = String(signal.imagem_url ?? "").trim();
    if (!/^\d+$/.test(raw)) return null;
    let provider;
    try { provider = normalizeProvider(signal.categoria_jogo); } catch { return null; }
    const providerPath = LEGACY_PROVIDER_PATHS[provider];
    return providerPath ? `https://reidoslotsinais.org/image/${providerPath}/${raw}.webp` : null;
  };
  const urls = [...new Set([
    ...games.flatMap((game) => [game.storage_image_url, game.storage_icon_url]),
    ...(signals ?? []).map((signal) => signal.imagem_url),
    ...(signals ?? []).map(legacyUrlForSignal),
  ].map((value) => String(value ?? "").trim()).filter((value) => value && value !== PLACEHOLDER && !/^\/?\d+$/.test(value)))];
  const checks = await mapLimit(urls, 10, async (value) => [value, await inspectHttpUrl(value, allowedHosts)]);
  const checkByUrl = new Map(checks);
  const check = async (value) => checkByUrl.get(String(value ?? "").trim()) ?? inspectHttpUrl(value, allowedHosts);

  const matchesByIdentity = new Map();
  const gamesByExternalIdentity = new Map();
  for (const game of games) {
    const key = identity(game.provider_normalized, game.name);
    const current = matchesByIdentity.get(key) ?? [];
    current.push(game);
    matchesByIdentity.set(key, current);
    gamesByExternalIdentity.set(`${game.provider_normalized}:${game.external_id}`, game);
  }

  const gameChecks = await Promise.all(games.map(async (game) => ({
    game,
    cover: await check(game.storage_image_url),
    icon: await check(game.storage_icon_url),
  })));
  const gameCheckById = new Map(gameChecks.map((entry) => [entry.game.id, entry]));
  const records = [];

  for (const signal of signals ?? []) {
    let provider;
    try { provider = normalizeProvider(signal.categoria_jogo); } catch { provider = String(signal.categoria_jogo ?? "").toLowerCase(); }
    const candidates = matchesByIdentity.get(identity(provider, signal.nome_jogo)) ?? [];
    const match = candidates.length === 1 ? candidates[0] : null;
    const media = match ? gameCheckById.get(match.id) : null;
    const current = await check(signal.imagem_url);
    const legacyUrl = legacyUrlForSignal(signal);
    const legacyCandidate = legacyUrl ? await check(legacyUrl) : null;
    const rawImage = String(signal.imagem_url ?? "").trim();
    const claimedGame = /^\d+$/.test(rawImage) ? gamesByExternalIdentity.get(`${provider}:${rawImage}`) : null;
    const cover = media?.cover ?? null;
    const icon = media?.icon ?? null;
    const usesPlaceholder = !cover?.valid && !icon?.valid && (!current.valid || current.url === PLACEHOLDER);
    let reason = null;
    if (candidates.length > 1) reason = "correspondência ambígua em public.games";
    else if (!match && claimedGame) reason = `ID numérico antigo aponta atualmente para outro jogo: ${claimedGame.name}`;
    else if (!match) reason = "sem correspondência segura em public.games";
    else if (!cover?.valid && icon?.valid) reason = "capa inválida; ícone válido disponível";
    else if (!cover?.valid && !icon?.valid) reason = "capa e ícone próprios inválidos";
    else if (current.url === PLACEHOLDER && !cover?.valid) reason = "imagem atual é o placeholder";
    else if (/^\/?\d+$/.test(current.url)) reason = "imagem atual é numérica";
    else if (!current.valid && !cover?.valid && !icon?.valid) reason = current.reason || "imagem atual inválida";

    if (reason || usesPlaceholder) {
      records.push({
        signalId: signal.id,
        gameId: match?.id ?? null,
        externalId: match?.external_id ?? null,
        name: signal.nome_jogo,
        provider,
        currentDatabaseImage: signal.imagem_url || null,
        current: { status: current.status, contentType: current.contentType, valid: current.valid, reason: current.reason },
        cover: cover ? { url: cover.url, status: cover.status, contentType: cover.contentType, valid: cover.valid, reason: cover.reason } : null,
        icon: icon ? { url: icon.url, status: icon.status, contentType: icon.contentType, valid: icon.valid, reason: icon.reason } : null,
        legacyCandidate: legacyCandidate ? { url: legacyCandidate.url, status: legacyCandidate.status, contentType: legacyCandidate.contentType, valid: legacyCandidate.valid, reason: legacyCandidate.reason } : null,
        claimedGame: claimedGame ? { gameId: claimedGame.id, externalId: claimedGame.external_id, name: claimedGame.name, provider: claimedGame.provider_normalized } : null,
        reason: reason || "placeholder necessário",
        recommendedAction: recommendedAction({ match, cover, icon, current }),
        pendingManualReview: usesPlaceholder,
      });
    }
  }

  for (const { game, cover, icon } of gameChecks) {
    if (cover.valid && icon.valid) continue;
    records.push({
      signalId: null,
      gameId: game.id,
      externalId: game.external_id,
      name: game.name,
      provider: game.provider_normalized,
      currentDatabaseImage: game.storage_image_url,
      current: null,
      cover: { url: cover.url, status: cover.status, contentType: cover.contentType, valid: cover.valid, reason: cover.reason },
      icon: { url: icon.url, status: icon.status, contentType: icon.contentType, valid: icon.valid, reason: icon.reason },
      legacyCandidate: null,
      claimedGame: null,
      reason: !cover.valid && icon.valid ? "capa inválida; ícone válido disponível" : !cover.valid ? "capa própria inválida" : "ícone próprio inválido",
      recommendedAction: recommendedAction({ match: game, cover, icon, current: null }),
      pendingManualReview: !cover.valid && !icon.valid,
    });
  }

  const validOwnCovers = gameChecks.filter(({ cover }) => cover.valid).length;
  const iconFallbacks = records.filter((record) => !record.cover?.valid && record.icon?.valid).length;
  const pending = records.filter((record) => record.pendingManualReview);
  return {
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    summary: {
      totalGames: games.length,
      totalSignals: signals?.length ?? 0,
      validOwnCovers,
      validOwnIcons: gameChecks.filter(({ icon }) => icon.valid).length,
      iconFallbacks,
      placeholders: pending.length,
      issues: records.length,
      urlsChecked: urls.length,
    },
    pending: pending.map((record) => ({ signalId: record.signalId, gameId: record.gameId, externalId: record.externalId, name: record.name, provider: record.provider, reason: record.reason })),
    records,
    remoteWrites: 0,
  };
}

export function writeMissingImagesReport(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const jsonPath = path.join(REPORT_DIR, "missing-images-report.json");
  const textPath = path.join(REPORT_DIR, "missing-images-report.txt");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "Slot da Sorte — auditoria de imagens ausentes",
    `Gerado em: ${report.generatedAt}`,
    "Modo: somente leitura",
    `Jogos/sinais: ${report.summary.totalGames}/${report.summary.totalSignals}`,
    `Capas/ícones próprios válidos: ${report.summary.validOwnCovers}/${report.summary.validOwnIcons}`,
    `Fallbacks por ícone: ${report.summary.iconFallbacks}`,
    `Placeholders pendentes: ${report.summary.placeholders}`,
    `URLs verificadas: ${report.summary.urlsChecked}`,
    "",
    ...report.records.map((record) => [
      `[${record.provider}:${record.externalId ?? "sem-id"}] ${record.name} (sinal ${record.signalId ?? "n/a"}, game ${record.gameId ?? "n/a"})`,
      `Imagem atual: ${record.currentDatabaseImage ?? "vazia"}`,
      `Cover: ${record.cover ? `${record.cover.status ?? "sem status"} ${record.cover.contentType ?? "sem content-type"}` : "ausente"}`,
      `Icon: ${record.icon ? `${record.icon.status ?? "sem status"} ${record.icon.contentType ?? "sem content-type"}` : "ausente"}`,
      `Compatibilidade legada: ${record.legacyCandidate ? `${record.legacyCandidate.status ?? "sem status"} ${record.legacyCandidate.contentType ?? "sem content-type"}` : "n/a"}`,
      `Motivo: ${record.reason}`,
      `Ação: ${record.recommendedAction}`,
      "",
    ].join("\n")),
    "Escritas remotas: ZERO",
  ];
  fs.writeFileSync(textPath, `${lines.join("\n")}\n`);
  return { jsonPath, textPath };
}
