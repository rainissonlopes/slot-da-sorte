import crypto from "node:crypto";
import { MAX_IMAGE_BYTES } from "./config.mjs";
import { fetchWithPolicy } from "./network.mjs";

export function detectImageType(buffer) {
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(4, 12).toString("ascii").includes("ftyp") && buffer.subarray(8, 16).toString("ascii").includes("avif")) return "image/avif";
  return null;
}

export function extensionForContentType(contentType) {
  const extensions = new Map([
    ["image/webp", "webp"],
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/gif", "gif"],
    ["image/avif", "avif"],
  ]);
  const extension = extensions.get(contentType);
  if (!extension) throw new Error(`Formato de imagem sem extensão segura: ${contentType}`);
  return extension;
}

export async function downloadRemoteImage(url, options = {}) {
  const { response, finalUrl, redirects } = await fetchWithPolicy(url, {
    timeoutMs: 20_000,
    allowlist: options.allowlist,
  });
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  const declared = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
  if (!declared.startsWith("image/")) throw new Error(`Content-Type não é imagem: ${declared || "ausente"}`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw new Error(`Imagem excede ${MAX_IMAGE_BYTES} bytes`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Resposta de imagem sem corpo");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error(`Imagem excede ${MAX_IMAGE_BYTES} bytes`);
    }
    chunks.push(Buffer.from(value));
  }
  const body = Buffer.concat(chunks);
  const detected = detectImageType(body);
  if (!detected) throw new Error("Assinatura binária não corresponde a uma imagem aceita");
  if (declared !== detected && !(declared === "image/jpg" && detected === "image/jpeg")) throw new Error(`Content-Type ${declared} diverge de ${detected}`);
  return { url, finalUrl, redirects, bytes: body.length, contentType: detected, hash: crypto.createHash("sha256").update(body).digest("hex"), body };
}

export async function validateRemoteImage(url) {
  const downloaded = await downloadRemoteImage(url);
  const metadata = { ...downloaded };
  delete metadata.body;
  return metadata;
}

export async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function auditImages(games, logger) {
  const entries = [];
  for (const game of games) {
    if (game.original_image_url) entries.push({ key: `${game.provider_normalized}:${game.external_id}:cover`, url: game.original_image_url, path: game.storage_image_path });
    if (game.original_icon_url) entries.push({ key: `${game.provider_normalized}:${game.external_id}:icon`, url: game.original_icon_url, path: game.storage_icon_path });
  }
  const uniqueUrls = [...new Map(entries.map((entry) => [entry.url, entry])).values()];
  logger.info("Validando imagens públicas", { references: entries.length, uniqueUrls: uniqueUrls.length, concurrency: 6 });
  const checked = await mapLimit(uniqueUrls, 6, async (entry) => {
    try { return { ...entry, valid: true, ...(await validateRemoteImage(entry.url)) }; }
    catch (error) { return { ...entry, valid: false, error: error instanceof Error ? error.message : String(error) }; }
  });
  const byUrl = new Map(checked.map((item) => [item.url, item]));
  const results = entries.map((entry) => ({ ...byUrl.get(entry.url), ...entry }));
  const hashes = new Map();
  for (const item of checked.filter((value) => value.valid)) hashes.set(item.hash, (hashes.get(item.hash) ?? 0) + 1);
  return {
    references: results.length,
    uniqueUrls: checked.length,
    valid: results.filter((item) => item.valid).length,
    invalid: results.filter((item) => !item.valid).length,
    invalidItems: results.filter((item) => !item.valid).map(({ key, url, error }) => ({ key, url, error })),
    duplicateHashes: [...hashes.entries()].filter(([, count]) => count > 1).map(([hash, count]) => ({ hash, count })),
    items: results,
  };
}
