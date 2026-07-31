import { EXPECTED_BRANCH, loadEnv, parseFlags, SOURCE_ORIGIN } from "./config.mjs";
import { applyPlan, assertApplySafety } from "./apply.mjs";
import { currentBranch } from "./git.mjs";
import { auditImages } from "./images.mjs";
import { createLogger } from "./logger.mjs";
import { catalogFingerprint } from "./normalize.mjs";
import { buildPlan } from "./plan.mjs";
import { readReport, writeReport } from "./report.mjs";
import { collectCatalog } from "./source.mjs";
import { inspectSupabase } from "./supabase.mjs";
import { validateCollectedCatalog } from "./validate.mjs";
import { verifyImport } from "./verify.mjs";

const mode = process.argv[2];
const flags = parseFlags(process.argv.slice(3));
const logger = createLogger();

function publicCollectionSummary(collected) {
  return {
    durationMs: collected.durationMs,
    action: { method: collected.action.method, bundle: collected.action.bundle, idFingerprint: `${collected.action.id.slice(0, 8)}…${collected.action.id.slice(-6)}` },
    routes: collected.routes.map((route) => ({ route: route.route, provider: route.provider, count: route.games.length, pages: route.pages })),
  };
}

async function prepare() {
  const collected = await collectCatalog(logger);
  const validation = validateCollectedCatalog(collected, flags);
  const fingerprint = catalogFingerprint(validation.normalized);
  const images = await auditImages(validation.normalized, logger);
  const supabase = await inspectSupabase(loadEnv());
  const plan = buildPlan(validation.normalized, supabase.signals, images, supabase.url);
  return { collected, validation, fingerprint, images, supabase, plan };
}

async function preview() {
  const startedAt = Date.now();
  if (currentBranch() !== EXPECTED_BRANCH) throw new Error(`Preview recusado fora da branch ${EXPECTED_BRANCH}`);
  const prepared = await prepare();
  const warnings = [];
  if (prepared.images.invalid) warnings.push(`${prepared.images.invalid} referências de imagem inválidas serão preservadas/ignoradas no apply`);
  if (prepared.plan.ambiguous.length) warnings.push(`${prepared.plan.ambiguous.length} correspondências ambíguas bloqueiam o apply`);
  if (!prepared.supabase.audit.storage.preferredBucketVisible) warnings.push("Bucket games não está visível para a chave anon; confirmar com credencial administrativa antes do apply");
  if (!prepared.supabase.audit.gamesTable.readable) warnings.push("Tabela games ainda não está disponível; migration proposta precisa de revisão e aprovação");
  const report = {
    mode: "preview",
    status: "success",
    generatedAt: new Date().toISOString(),
    source: SOURCE_ORIGIN,
    branch: currentBranch(),
    durationMs: Date.now() - startedAt,
    fingerprint: prepared.fingerprint,
    validation: { ...prepared.validation, normalized: undefined },
    collection: publicCollectionSummary(prepared.collected),
    images: prepared.images,
    supabase: prepared.supabase.audit,
    plan: { ...prepared.plan, matches: undefined },
    warnings,
    errors: [],
    zeroRemoteWrites: true,
    remoteOperations: { reads: true, databaseWrites: 0, storageWrites: 0, schemaWrites: 0 },
  };
  const paths = writeReport("preview", report);
  logger.info("Preview concluído com zero escritas remotas", { reportJson: paths.json, reportText: paths.text });
  console.log(JSON.stringify({ status: report.status, counts: report.validation.counts, images: { valid: report.images.valid, invalid: report.images.invalid }, plan: report.plan.summary, warnings }, null, 2));
}

async function apply() {
  const previewReport = readReport("preview");
  const prepared = await prepare();
  const env = loadEnv();
  assertApplySafety({ preview: previewReport, flags, env, fingerprint: prepared.fingerprint });
  const result = await applyPlan({ env, plan: prepared.plan, games: prepared.validation.normalized, logger });
  writeReport("apply", {
    mode: "apply",
    status: "success",
    generatedAt: new Date().toISOString(),
    fingerprint: prepared.fingerprint,
    sourceCounts: prepared.validation.counts,
    images: { references: prepared.images.references, uniqueUrls: prepared.images.uniqueUrls, invalid: prepared.images.invalid },
    result,
    zeroRemoteWrites: false,
  });
}

async function verify() {
  const result = await verifyImport(loadEnv());
  writeReport("verify", { mode: "verify", status: result.success ? "success" : "failed", generatedAt: new Date().toISOString(), result, zeroRemoteWrites: true });
  if (!result.success) process.exitCode = 1;
}

try {
  if (mode === "preview") await preview();
  else if (mode === "apply") await apply();
  else if (mode === "verify") await verify();
  else throw new Error("Modo inválido. Use preview, apply ou verify.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(message);
  if (mode && ['preview', 'apply', 'verify'].includes(mode)) {
    writeReport(mode, { mode, status: "failed", generatedAt: new Date().toISOString(), errors: [message], validation: error?.validation, failures: error?.failures, zeroRemoteWrites: mode !== "apply" });
  }
  process.exitCode = 1;
}
