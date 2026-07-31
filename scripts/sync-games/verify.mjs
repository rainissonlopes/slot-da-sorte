import { STORAGE_BUCKET } from "./config.mjs";
import { mapLimit } from "./images.mjs";
import { fetchWithPolicy } from "./network.mjs";
import { createAdminClient, inspectImportedGames } from "./supabase.mjs";

export async function verifyImport(env) {
  const { url, client } = createAdminClient(env);
  const rows = await inspectImportedGames(client);
  const projectHost = new URL(url).hostname;
  const providerCounts = Object.fromEntries(["pg", "pp", "tada", "wg"].map((provider) => [provider, rows.filter((row) => row.provider_normalized === provider).length]));
  const mainUrls = rows.map((row) => row.storage_image_url);
  const allUrls = [...new Set(rows.flatMap((row) => [row.storage_image_url, row.storage_icon_url]).filter(Boolean))];
  const externalMainImages = mainUrls.filter((value) => {
    try { return new URL(value).hostname !== projectHost; } catch { return Boolean(value); }
  });
  const nextImageUrls = mainUrls.filter((value) => String(value ?? "").includes("/_next/image"));
  const numeric = mainUrls.filter((value) => /^\/?\d+$/.test(String(value ?? "")));
  const missing = rows.filter((row) => !row.storage_image_url || !row.storage_icon_url);
  const objectChecks = await mapLimit(allUrls, 10, async (publicUrl) => {
    try {
      const { response } = await fetchWithPolicy(publicUrl, { allowlist: [projectHost], fetchOptions: { method: "HEAD" } });
      return { publicUrl, status: response.status, exists: response.ok };
    } catch (error) {
      return { publicUrl, exists: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  const { data: signals, error: signalError } = await client.from("sinais")
    .select("id,nome_jogo,categoria_jogo,imagem_url,cor_background,bets,ativo,created_at")
    .in("id", [1, 37])
    .order("id");
  if (signalError) throw signalError;
  const signal1 = signals.find((row) => Number(row.id) === 1);
  const signal37 = signals.find((row) => Number(row.id) === 37);
  const pg126 = rows.find((row) => row.provider_normalized === "pg" && row.external_id === "126");
  const failures = [];
  if (rows.length !== 304) failures.push(`games count ${rows.length} != 304`);
  for (const [provider, expected] of Object.entries({ pg: 168, pp: 49, tada: 61, wg: 26 })) {
    if (providerCounts[provider] !== expected) failures.push(`${provider} count ${providerCounts[provider]} != ${expected}`);
  }
  if (allUrls.length !== 608) failures.push(`storage URL count ${allUrls.length} != 608`);
  if (objectChecks.some((item) => !item.exists)) failures.push(`${objectChecks.filter((item) => !item.exists).length} objetos inexistentes`);
  if (externalMainImages.length) failures.push(`${externalMainImages.length} imagens principais externas`);
  if (nextImageUrls.length) failures.push(`${nextImageUrls.length} URLs /_next/image`);
  if (numeric.length) failures.push(`${numeric.length} URLs numéricas`);
  if (missing.length) failures.push(`${missing.length} jogos sem cover/icon`);
  if (pg126?.name !== "Hawaiian Tiki") failures.push("pg:126 não é Hawaiian Tiki");
  if (signal1?.nome_jogo !== "Fortune Tiger" || String(signal1?.imagem_url) === "126") failures.push("sinais.id 1 incorreto");
  if (signal37?.nome_jogo !== "Honey Trap of Diao Chan" || String(signal37?.imagem_url) === "126") failures.push("sinais.id 37 incorreto");
  return {
    rowCount: rows.length,
    providerCounts,
    bucket: STORAGE_BUCKET,
    storageUrls: allUrls.length,
    objectsChecked: objectChecks.length,
    missingObjects: objectChecks.filter((item) => !item.exists),
    externalMainImages: externalMainImages.length,
    nextImageUrls: nextImageUrls.length,
    numericInvalidSources: numeric.length,
    missingImages: missing.length,
    pg126: pg126 ? { external_id: pg126.external_id, provider: pg126.provider_normalized, name: pg126.name, storage_image_url: pg126.storage_image_url } : null,
    signals: [signal1, signal37],
    failures,
    success: failures.length === 0,
  };
}
