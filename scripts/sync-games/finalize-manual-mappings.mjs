import fs from "node:fs";
import path from "node:path";
import { REPORT_DIR, loadEnv } from "./config.mjs";
import { auditMissingImages } from "./missing-images.mjs";
import { createReadClient } from "./supabase.mjs";

const planPath = path.join(REPORT_DIR, "manual-mappings-confirmed-plan.json");
if (!fs.existsSync(planPath)) throw new Error(`Plano confirmado não encontrado: ${planPath}`);
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const approved = plan.preview.filter((entry) => entry.status === "approved");
if (approved.length !== 9) throw new Error(`Esperados 9 mappings aprovados; encontrados ${approved.length}`);

const { client } = createReadClient(loadEnv());
const ids = approved.map((entry) => entry.mapping.signal_id);
const { data: currentSignals, error } = await client.from("sinais").select("*").in("id", ids).order("id");
if (error) throw error;
const currentById = new Map((currentSignals ?? []).map((signal) => [Number(signal.id), signal]));

function comparable(row) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== "imagem_url"));
}

const changes = approved.map((entry) => {
  const current = currentById.get(Number(entry.mapping.signal_id));
  if (!current) throw new Error(`Sinal ${entry.mapping.signal_id} ausente após apply`);
  if (current.imagem_url !== entry.game.storage_image_url) throw new Error(`Sinal ${entry.mapping.signal_id} não recebeu a cover aprovada`);
  if (JSON.stringify(comparable(current)) !== JSON.stringify(comparable(entry.before))) throw new Error(`Campo protegido mudou no sinal ${entry.mapping.signal_id}`);
  return {
    signalId: entry.mapping.signal_id,
    signalName: entry.mapping.signal_name,
    gameId: entry.mapping.game_id,
    gameName: entry.game.name,
    externalId: entry.mapping.external_id,
    providerNormalized: entry.mapping.provider_normalized,
    before: entry.before,
    after: current,
    changedFields: ["imagem_url"],
    protectedFieldsUnchanged: true,
  };
});

const audit = await auditMissingImages();
const expectedPending = ["Muay Thai", "Rave Party Fever", "Fruity Candy", "Roost Rumble", "Secrets of Cleopatra", "Medusa", "Egypt's Book of Mystery", "Medusa 2", "Super Market", "Sugar Hush", "Dragon Tiger", "Lucky Clover Lady"];
const pendingNames = audit.pending.map((item) => item.name).sort();
if (JSON.stringify(pendingNames) !== JSON.stringify([...expectedPending].sort())) throw new Error(`Lista de pendentes divergente: ${pendingNames.join(", ")}`);

const applyReport = {
  generatedAt: new Date().toISOString(),
  mode: "manual-mappings-apply",
  applied: changes.length,
  remoteWrites: changes.length,
  updatedFields: ["imagem_url"],
  protectedFieldsUnchanged: changes.every((change) => change.protectedFieldsUnchanged),
  changes,
};
const verifyReport = {
  generatedAt: new Date().toISOString(),
  mode: "manual-mappings-verify",
  success: audit.summary.totalGames === 304 && audit.summary.placeholders === 12 && audit.summary.externalMainImages === 0 && audit.summary.numericInvalidSources === 0 && audit.summary.missingStorageObjects === 0,
  catalogGames: audit.summary.totalGames,
  correctedPlaceholders: 9,
  remainingPlaceholders: audit.summary.placeholders,
  externalMainImages: audit.summary.externalMainImages,
  numericInvalidSources: audit.summary.numericInvalidSources,
  rawNumericLegacyValuesRejected: audit.summary.rawNumericSignalValues,
  missingStorageObjects: audit.summary.missingStorageObjects,
  ambiguousAssociationsApplied: 0,
  pending: audit.pending,
};

function writeReports(baseName, report, lines) {
  const jsonPath = path.join(REPORT_DIR, `${baseName}.json`);
  const textPath = path.join(REPORT_DIR, `${baseName}.txt`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(textPath, `${lines.join("\n")}\n`);
  return { jsonPath, textPath };
}

const applyPaths = writeReports("manual-mappings-apply-report", applyReport, [
  "Slot da Sorte — aplicação de mappings manuais", `Gerado em: ${applyReport.generatedAt}`, `Registros atualizados: ${applyReport.applied}`, "Campo atualizado: imagem_url", `Campos protegidos preservados: ${applyReport.protectedFieldsUnchanged ? "SIM" : "NÃO"}`, "", ...changes.map((change) => `[${change.signalId}] ${change.signalName}: ${change.before.imagem_url} -> ${change.after.imagem_url}`),
]);
const verifyPaths = writeReports("manual-mappings-verify", verifyReport, [
  "Slot da Sorte — verificação de mappings manuais", `Gerado em: ${verifyReport.generatedAt}`, `Resultado: ${verifyReport.success ? "SUCESSO" : "FALHA"}`, `Jogos no catálogo: ${verifyReport.catalogGames}`, `Placeholders corrigidos: ${verifyReport.correctedPlaceholders}`, `Placeholders restantes: ${verifyReport.remainingPlaceholders}`, `URLs externas principais: ${verifyReport.externalMainImages}`, `src numérico inválido: ${verifyReport.numericInvalidSources}`, `Objetos inexistentes: ${verifyReport.missingStorageObjects}`, `Associações ambíguas aplicadas: ${verifyReport.ambiguousAssociationsApplied}`, "", "Pendentes:", ...audit.pending.map((item) => `- [${item.signalId}] ${item.name}`),
]);

console.log(JSON.stringify({ apply: applyReport, verify: verifyReport, paths: { apply: applyPaths, verify: verifyPaths } }, null, 2));
