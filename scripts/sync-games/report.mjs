import fs from "node:fs";
import path from "node:path";
import { REPORT_DIR } from "./config.mjs";

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/secret|token|authorization|anon_key|service_role|publishable_key/i.test(key))
    .map(([key, child]) => [key, sanitize(child)]));
}

export function reportPaths(mode) {
  return {
    json: path.join(REPORT_DIR, `${mode}-report.json`),
    text: path.join(REPORT_DIR, `${mode}-report.txt`),
  };
}

export function writeReport(mode, report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const safe = sanitize(report);
  const paths = reportPaths(mode);
  fs.writeFileSync(paths.json, `${JSON.stringify(safe, null, 2)}\n`);
  const lines = [
    `Slot da Sorte — sync-games ${mode}`,
    `Status: ${safe.status}`,
    `Gerado em: ${safe.generatedAt}`,
    `Fingerprint: ${safe.fingerprint ?? "n/a"}`,
  ];

  if (mode === "preview") lines.push(
    `Fonte: ${safe.source ?? "n/a"}`,
    `Total coletado: ${safe.validation?.counts?.total ?? "n/a"}`,
    `Por provider: ${JSON.stringify(safe.validation?.counts ?? {})}`,
    `Páginas: ${safe.collection?.routes?.map((route) => `${route.route}=${route.pages.length}`).join(", ") ?? "n/a"}`,
    `Imagens válidas/inválidas: ${safe.images?.valid ?? 0}/${safe.images?.invalid ?? 0}`,
    `Matching: ${JSON.stringify(safe.plan?.summary ?? {})}`,
    `Ambiguidades: ${safe.plan?.ambiguous?.length ?? 0}`,
  );

  if (mode === "apply") lines.push(
    `Jogos importados: ${safe.result?.databaseRows ?? 0}`,
    `Por provider: ${JSON.stringify(safe.sourceCounts ?? {})}`,
    `Referências/URLs únicas: ${safe.images?.references ?? 0}/${safe.images?.uniqueUrls ?? 0}`,
    `Uploads enviados/reutilizados: ${safe.result?.uploaded ?? 0}/${safe.result?.reusedUploads ?? 0}`,
    `Sinais atualizados: ${safe.result?.signalUpdates ?? 0}`,
    `pg:126: ${safe.result?.pg126?.name ?? "n/a"}`,
  );

  if (mode === "verify") lines.push(
    `Jogos verificados: ${safe.result?.rowCount ?? 0}`,
    `Por provider: ${JSON.stringify(safe.result?.providerCounts ?? {})}`,
    `Bucket: ${safe.result?.bucket ?? "n/a"}`,
    `Objetos verificados/ausentes: ${safe.result?.objectsChecked ?? 0}/${safe.result?.missingObjects?.length ?? 0}`,
    `URLs externas/_next/numéricas: ${safe.result?.externalMainImages ?? 0}/${safe.result?.nextImageUrls ?? 0}/${safe.result?.numericInvalidSources ?? 0}`,
    `Mídias ausentes: ${safe.result?.missingImages ?? 0}`,
    `Falhas: ${safe.result?.failures?.length ?? 0}`,
  );

  lines.push(
    `Erros: ${(safe.errors ?? []).join(" | ") || "nenhum"}`,
    `Avisos: ${(safe.warnings ?? []).join(" | ") || "nenhum"}`,
    `Escritas remotas: ${safe.zeroRemoteWrites ? "ZERO" : "SIM"}`,
  );
  fs.writeFileSync(paths.text, `${lines.join("\n")}\n`);
  return paths;
}

export function readReport(mode) {
  return JSON.parse(fs.readFileSync(reportPaths(mode).json, "utf8"));
}
