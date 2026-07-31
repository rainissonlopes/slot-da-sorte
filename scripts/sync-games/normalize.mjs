import crypto from "node:crypto";
import { SOURCE_ORIGIN, STORAGE_BUCKET } from "./config.mjs";

const PROVIDERS = new Map([
  ["pg", "pg"], ["pg games", "pg"], ["pg soft", "pg"], ["pg-soft", "pg"],
  ["pp", "pp"], ["pp games", "pp"], ["pragmatic", "pp"], ["pragmatic play", "pp"],
  ["tada", "tada"], ["tada gaming", "tada"],
  ["wg", "wg"], ["wg games", "wg"],
]);

export function normalizeText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeProvider(value) {
  const normalized = normalizeText(value);
  const provider = PROVIDERS.get(normalized);
  if (!provider) throw new Error(`Provider desconhecido: ${value}`);
  return provider;
}

export function normalizeImageUrl(raw, baseUrl = SOURCE_ORIGIN) {
  if (!raw || typeof raw !== "string") return null;
  const absolute = new URL(raw.trim(), baseUrl);
  if (absolute.pathname === "/_next/image") {
    const original = absolute.searchParams.get("url");
    if (!original) throw new Error("URL de Next Image sem parâmetro url");
    return new URL(original, baseUrl).toString();
  }
  return absolute.toString();
}

export function safeSegment(value) {
  const raw = String(value ?? "");
  if (raw.includes("/") || raw.includes("\\") || raw.includes("..")) {
    throw new Error("Segmento de Storage contém sequência de path proibida");
  }
  const safe = normalizeText(raw).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!safe || safe.length > 100) throw new Error("Segmento de Storage inválido");
  return safe;
}

export function storagePath(provider, externalId, kind, extension = "webp") {
  if (!['cover', 'icon'].includes(kind)) throw new Error(`Tipo de imagem inválido: ${kind}`);
  return `${safeSegment(provider)}/${safeSegment(externalId)}/${kind}.${safeSegment(extension)}`;
}

export function storagePublicUrl(supabaseUrl, path) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export function normalizeGame(raw) {
  const provider = normalizeProvider(raw.categoriaJogo);
  const externalId = String(raw.id ?? "").trim();
  if (!/^[-_a-zA-Z0-9]+$/.test(externalId)) throw new Error(`external_id inválido: ${externalId}`);
  const name = String(raw.nomeJogo ?? "").trim();
  const nameNormalized = normalizeText(name);
  if (!nameNormalized) throw new Error(`Jogo ${externalId} sem nome`);
  const originalImageUrl = normalizeImageUrl(raw.imageUrl);
  const originalIconUrl = normalizeImageUrl(raw.iconUrl);
  const permanent = {
    source: "rei-dos-slots",
    external_id: externalId,
    provider,
    provider_normalized: provider,
    name,
    name_normalized: nameNormalized,
    source_url: SOURCE_ORIGIN,
    original_image_url: originalImageUrl,
    storage_image_path: storagePath(provider, externalId, "cover"),
    storage_image_url: null,
    original_icon_url: originalIconUrl,
    storage_icon_path: originalIconUrl ? storagePath(provider, externalId, "icon") : null,
    storage_icon_url: null,
    source_payload: {
      id: raw.id,
      nomeJogo: raw.nomeJogo,
      categoriaJogo: raw.categoriaJogo,
      imageUrl: raw.imageUrl,
      iconUrl: raw.iconUrl,
      updatedAt: raw.updatedAt,
    },
    source_updated_at: raw.updatedAt ?? null,
  };
  return {
    ...permanent,
    imported_at: new Date().toISOString(),
    content_hash: crypto.createHash("sha256").update(JSON.stringify(permanent)).digest("hex"),
  };
}

export function catalogFingerprint(games) {
  const stable = games.map((game) => ({
    source: game.source,
    external_id: game.external_id,
    provider: game.provider_normalized,
    name: game.name_normalized,
    image: game.original_image_url,
    icon: game.original_icon_url,
    source_updated_at: game.source_updated_at,
  })).sort((a, b) => `${a.provider}:${a.external_id}`.localeCompare(`${b.provider}:${b.external_id}`));
  return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
