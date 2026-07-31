import { EXPECTED_BRANCH, PREVIEW_MAX_AGE_MS, STORAGE_BUCKET } from "./config.mjs";
import { currentBranch } from "./git.mjs";
import { downloadRemoteImage, mapLimit } from "./images.mjs";
import { preserveManualFields } from "./plan.mjs";
import { createAdminClient, inspectImportedGames } from "./supabase.mjs";

const SIGNAL_AUDIT_COLUMNS = "id,nome_jogo,categoria_jogo,imagem_url,cor_background,bets,ativo,created_at";

export function assertApplySafety({ preview, flags, env, fingerprint }) {
  if (!flags.has("--confirm")) throw new Error("Apply recusado: use --confirm após revisar o preview");
  const branch = currentBranch();
  if (branch !== EXPECTED_BRANCH) throw new Error(`Apply recusado na branch ${branch || "desconhecida"}`);
  if (process.env.VERCEL_ENV === "production" && !flags.has("--allow-production")) throw new Error("Apply recusado em produção sem --allow-production");
  if (!env.SUPABASE_SECRET_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Apply recusado: credencial administrativa ausente");
  if (preview.status !== "success" || !preview.zeroRemoteWrites) throw new Error("Apply recusado: preview não é válido");
  if (Date.now() - Date.parse(preview.generatedAt) > PREVIEW_MAX_AGE_MS) throw new Error("Apply recusado: preview expirado");
  if (preview.fingerprint !== fingerprint) throw new Error("Apply recusado: fonte mudou desde o preview");
  if (preview.validation?.counts?.total !== 304) throw new Error("Apply recusado: preview não contém 304 jogos");
  if (preview.images?.invalid !== 0) throw new Error("Apply recusado: preview contém imagens inválidas");
  if (preview.plan?.ambiguous?.length) throw new Error("Apply recusado: matching ambíguo");
}

async function uploadOne(client, upload, body) {
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(upload.path, body, {
    contentType: upload.contentType,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(upload.path);
  return data.publicUrl;
}

function gameKey(game) {
  return `${game.provider_normalized}:${game.external_id}`;
}

function mediaKind(key) {
  return key.endsWith(":icon") ? "icon" : "cover";
}

async function readConflictBackup(client) {
  const { data, error } = await client.from("sinais").select(SIGNAL_AUDIT_COLUMNS).in("id", [1, 37]).order("id");
  if (error) throw error;
  if ((data ?? []).length !== 2) throw new Error("Backup lógico recusado: sinais.id 1 e 37 não foram encontrados");
  const signal1 = data.find((row) => Number(row.id) === 1);
  const signal37 = data.find((row) => Number(row.id) === 37);
  if (signal1?.nome_jogo !== "Fortune Tiger" || signal37?.nome_jogo !== "Honey Trap of Diao Chan") {
    throw new Error("Backup lógico recusado: identidade dos sinais 1/37 mudou");
  }
  return data;
}

export async function applyPlan({ env, plan, games, logger }) {
  const { url, client } = createAdminClient(env);
  const beforeSignals = await readConflictBackup(client);
  const bucketResult = await client.storage.listBuckets();
  if (bucketResult.error) throw bucketResult.error;
  const bucket = (bucketResult.data ?? []).find((item) => item.id === STORAGE_BUCKET || item.name === STORAGE_BUCKET);
  if (!bucket?.public) throw new Error("Bucket games não existe ou não é público após a migration");
  const tableProbe = await client.from("games").select("id", { head: true, count: "exact" });
  if (tableProbe.error) throw new Error(`Tabela games não está pronta: ${tableProbe.error.message}`);

  const existingGames = await inspectImportedGames(client);
  const existingByKey = new Map(existingGames.map((game) => [gameKey(game), game]));
  const sourceByKey = new Map(games.map((game) => [gameKey(game), game]));
  const uploaded = new Map();
  let reusedUploads = 0;

  for (const upload of plan.uploads) {
    const key = upload.key.replace(/:(cover|icon)$/, "");
    const existing = existingByKey.get(key);
    const source = sourceByKey.get(key);
    const kind = mediaKind(upload.key);
    const path = kind === "cover" ? existing?.storage_image_path : existing?.storage_icon_path;
    const publicUrl = kind === "cover" ? existing?.storage_image_url : existing?.storage_icon_url;
    if (existing?.content_hash === source?.content_hash && path === upload.path && publicUrl) {
      uploaded.set(upload.key, { url: publicUrl, path, reused: true });
      reusedUploads += 1;
    }
  }

  const pendingUploads = plan.uploads.filter((upload) => !uploaded.has(upload.key));
  const downloadCache = new Map();
  const getDownload = (upload) => {
    if (!downloadCache.has(upload.sourceUrl)) downloadCache.set(upload.sourceUrl, downloadRemoteImage(upload.sourceUrl));
    return downloadCache.get(upload.sourceUrl);
  };
  const uploadResults = await mapLimit(pendingUploads, 6, async (upload) => {
    try {
      const downloaded = await getDownload(upload);
      if (downloaded.hash !== upload.hash) throw new Error("Hash mudou desde o preview");
      const publicUrl = await uploadOne(client, upload, downloaded.body);
      logger.info("Upload confirmado", { key: upload.key, bytes: downloaded.bytes });
      return { upload, value: { url: publicUrl, path: upload.path, reused: false } };
    } catch (error) {
      return { upload, error: error instanceof Error ? error.message : String(error) };
    }
  });
  const failures = uploadResults.filter((result) => result.error).map((result) => ({ key: result.upload.key, error: result.error }));
  if (failures.length) throw Object.assign(new Error(`${failures.length} uploads falharam; banco não foi atualizado`), { failures });
  for (const result of uploadResults) uploaded.set(result.upload.key, result.value);

  const now = new Date().toISOString();
  const rows = games.map((game) => ({
    ...game,
    storage_image_path: uploaded.get(`${gameKey(game)}:cover`)?.path ?? null,
    storage_image_url: uploaded.get(`${gameKey(game)}:cover`)?.url ?? null,
    storage_icon_path: uploaded.get(`${gameKey(game)}:icon`)?.path ?? null,
    storage_icon_url: uploaded.get(`${gameKey(game)}:icon`)?.url ?? null,
    imported_at: now,
    updated_at: now,
  }));
  if (rows.some((row) => !row.storage_image_url || !row.storage_icon_url)) throw new Error("Importação recusada: jogo sem cover ou icon confirmado");

  for (let index = 0; index < rows.length; index += 50) {
    const batch = rows.slice(index, index + 50);
    const { error } = await client.from("games").upsert(batch, { onConflict: "source,provider_normalized,external_id" });
    if (error) throw error;
    const keys = batch.map((row) => row.external_id);
    const { data: confirmed, error: confirmationError } = await client.from("games")
      .select("external_id")
      .eq("source", "rei-dos-slots")
      .in("external_id", keys);
    if (confirmationError || (confirmed ?? []).length !== batch.length) throw new Error(`Falha ao confirmar lote iniciado em ${index}`);
  }

  let signalUpdates = 0;
  for (const match of plan.matches.filter((item) => ["exact", "fallback"].includes(item.type))) {
    const imageUrl = uploaded.get(`${gameKey(match.game)}:cover`)?.url;
    if (!imageUrl) continue;
    const patch = preserveManualFields(match.signal, { imagem_url: imageUrl });
    if (!patch.imagem_url) continue;
    const { error } = await client.from("sinais").update(patch).eq("id", match.signal.id);
    if (error) throw error;
    signalUpdates += 1;
  }

  const currentSignal37 = beforeSignals.find((row) => Number(row.id) === 37);
  if (String(currentSignal37?.imagem_url) === "126") {
    const { error } = await client.from("sinais").update({ imagem_url: "/placeholder-game.webp" }).eq("id", 37);
    if (error) throw error;
    signalUpdates += 1;
  }

  const afterSignals = await readConflictBackup(client);
  if (afterSignals.some((row) => String(row.imagem_url) === "126")) throw new Error("Correção incompleta: sinais 1/37 ainda reivindicam pg:126");
  const pg126 = rows.find((row) => row.provider_normalized === "pg" && row.external_id === "126");
  if (pg126?.name !== "Hawaiian Tiki") throw new Error("Correção incompleta: pg:126 não corresponde a Hawaiian Tiki");

  return {
    uploaded: pendingUploads.length,
    reusedUploads,
    uniqueDownloads: downloadCache.size,
    imageFailures: [],
    databaseRows: rows.length,
    signalUpdates,
    conflictBackup: { before: beforeSignals, after: afterSignals },
    pg126: { external_id: pg126.external_id, provider: pg126.provider_normalized, name: pg126.name, storage_image_url: pg126.storage_image_url },
    supabaseOrigin: new URL(url).origin,
  };
}
