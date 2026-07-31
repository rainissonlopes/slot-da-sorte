import { createClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "./config.mjs";
import { normalizeProvider, normalizeText } from "./normalize.mjs";

export function createReadClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias");
  return { url, client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

export function createAdminClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Modo apply exige SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY");
  return { url, client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

async function withReadRetry(label, operation, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await operation();
      if (!result?.error) return result;
      lastError = new Error(`${label}: ${result.error.message}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** (attempt - 1)));
  }
  throw new Error(`${label} falhou após ${attempts} tentativas: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function readAllSignals(client) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await withReadRetry(`Leitura de sinais a partir de ${from}`, () => client.from("sinais")
      .select("id,nome_jogo,categoria_jogo,imagem_url,cor_background,bets")
      .range(from, from + 999));
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

export async function inspectSupabase(env) {
  const { url, client } = createReadClient(env);
  const signals = await readAllSignals(client);
  const { data: buckets } = await withReadRetry("Auditoria de buckets", () => client.storage.listBuckets());
  const gamesProbe = await client.from("games").select("id", { count: "exact", head: true });
  const storageUrls = signals.filter((row) => {
    try { return new URL(row.imagem_url).hostname.endsWith("supabase.co"); } catch { return false; }
  }).length;
  return {
    url,
    signals,
    audit: {
      signalsTable: { readable: true, rowCount: signals.length, visibleColumns: signals[0] ? Object.keys(signals[0]) : [] },
      gamesTable: { readable: !gamesProbe.error, rowCount: gamesProbe.count ?? null, error: gamesProbe.error?.message ?? null },
      storage: {
        listBucketsReadable: true,
        buckets: (buckets ?? []).map((bucket) => ({ id: bucket.id, name: bucket.name, public: bucket.public })),
        error: null,
        preferredBucket: STORAGE_BUCKET,
        preferredBucketVisible: (buckets ?? []).some((bucket) => bucket.id === STORAGE_BUCKET || bucket.name === STORAGE_BUCKET),
        existingPublicImageUrlsInSignals: storageUrls,
      },
      limitations: [
        "A chave pública não permite auditar information_schema, constraints, triggers, índices ou políticas RLS.",
        "Desde 2026, o OpenAPI do Data API não é exposto de forma confiável à chave anon; a migration deve ser revisada no Dashboard/CLI antes do apply.",
      ],
    },
  };
}

export function existingSignalIdentity(row) {
  let provider = null;
  try { provider = normalizeProvider(row.categoria_jogo); } catch {}
  const rawImage = String(row.imagem_url ?? "").trim();
  return {
    ...row,
    provider_normalized: provider,
    external_id: /^\d+$/.test(rawImage) ? rawImage : null,
    name_normalized: normalizeText(row.nome_jogo),
    isManualImage: /^https?:\/\//.test(rawImage) && rawImage.includes("supabase.co"),
  };
}

export async function inspectImportedGames(client) {
  const { data, error } = await client.from("games")
    .select("id,source,external_id,provider,provider_normalized,name,name_normalized,source_url,original_image_url,storage_image_path,storage_image_url,original_icon_url,storage_icon_path,storage_icon_url,source_payload,content_hash,source_updated_at,imported_at,created_at,updated_at")
    .eq("source", "rei-dos-slots")
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}
