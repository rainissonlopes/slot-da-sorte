import fs from "node:fs";
import path from "node:path";
import { REPORT_DIR, ROOT, loadEnv } from "./config.mjs";
import { normalizeProvider } from "./normalize.mjs";
import { createReadClient } from "./supabase.mjs";
import { fetchWithPolicy } from "./network.mjs";

export async function previewManualMappings({ env = loadEnv(), file = path.join(ROOT, "scripts", "sync-games", "manual-image-mappings.local.json"), confirm = false } = {}) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo local obrigatório não encontrado: ${file}`);
  const mappings = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(mappings) || !mappings.length) throw new Error("O arquivo de mappings deve conter um array não vazio");
  const signalIds = mappings.map((mapping) => Number(mapping.signal_id));
  if (new Set(signalIds).size !== signalIds.length) throw new Error("signal_id duplicado no arquivo de mappings");
  const approved = mappings.filter((mapping) => mapping.status === "approved");
  if (approved.some((mapping) => !Number.isInteger(Number(mapping.game_id)))) throw new Error("Mapping approved exige game_id inteiro");
  const approvedGameIds = approved.map((mapping) => Number(mapping.game_id));
  if (new Set(approvedGameIds).size !== approvedGameIds.length) throw new Error("game_id duplicado entre mappings approved");
  const { client } = createReadClient(env);
  const [{ data: signals, error: signalsError }, gameResult] = await Promise.all([
    client.from("sinais").select("*").in("id", signalIds),
    approvedGameIds.length ? client.from("games").select("id,external_id,provider_normalized,name,storage_image_url,storage_icon_url").in("id", approvedGameIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (signalsError) throw signalsError;
  if (gameResult.error) throw gameResult.error;
  const signalById = new Map((signals ?? []).map((signal) => [Number(signal.id), signal]));
  const gameById = new Map((gameResult.data ?? []).map((game) => [Number(game.id), game]));
  const projectHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
  for (const game of gameResult.data ?? []) {
    if (!/^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/games\//.test(game.storage_image_url ?? "")) throw new Error(`Game ${game.id} sem storage_image_url própria válida`);
    const { response } = await fetchWithPolicy(game.storage_image_url, { allowlist: [projectHost], fetchOptions: { method: "HEAD" } });
    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
    if (response.status !== 200 || !contentType.startsWith("image/")) throw new Error(`Game ${game.id} com cover inacessível: HTTP ${response.status}, ${contentType || "sem content-type"}`);
  }
  const preview = mappings.map((mapping) => {
    const signal = signalById.get(Number(mapping.signal_id));
    if (!signal) throw new Error(`Sinal inexistente: ${mapping.signal_id}`);
    if (mapping.signal_name !== signal.nome_jogo) throw new Error(`Nome divergente no sinal ${mapping.signal_id}`);
    if (mapping.status !== "approved") return { signal, status: mapping.status, game: null, wouldUpdate: false };
    const game = gameById.get(Number(mapping.game_id));
    if (!game) throw new Error(`Game inexistente: ${mapping.game_id}`);
    const expectedProvider = normalizeProvider(signal.categoria_jogo);
    if (mapping.provider_normalized !== expectedProvider || game.provider_normalized !== expectedProvider) throw new Error(`Provider divergente no sinal ${mapping.signal_id}`);
    if (String(mapping.external_id) !== String(game.external_id)) throw new Error(`external_id divergente no game ${mapping.game_id}`);
    return {
      mapping,
      status: mapping.status,
      game,
      before: signal,
      after: { ...signal, imagem_url: game.storage_image_url },
      changedFields: signal.imagem_url === game.storage_image_url ? [] : ["imagem_url"],
      wouldUpdate: signal.imagem_url !== game.storage_image_url,
    };
  });
  const result = {
    generatedAt: new Date().toISOString(),
    mode: confirm ? "confirmed-plan" : "preview",
    remoteWrites: 0,
    approved: approved.length,
    pending: mappings.length - approved.length,
    allowedUpdateFields: ["imagem_url"],
    preview,
  };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const planPath = path.join(REPORT_DIR, confirm ? "manual-mappings-confirmed-plan.json" : "manual-mappings-preview.json");
  fs.writeFileSync(planPath, `${JSON.stringify(result, null, 2)}\n`);
  return { ...result, planPath, requiresPrivilegedExecutor: confirm };
}

try { console.log(JSON.stringify(await previewManualMappings({ confirm: process.argv.includes("--confirm") }), null, 2)); }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
