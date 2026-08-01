import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { EXPECTED_BRANCH, REPORT_DIR, ROOT, STORAGE_BUCKET, loadEnv } from "./config.mjs";
import { currentBranch } from "./git.mjs";
import { downloadRemoteImage, extensionForContentType } from "./images.mjs";
import { createAdminClient } from "./supabase.mjs";

const PROJECT_ORIGIN = "https://qcrzcutaudmgavavfpoq.supabase.co";
const ASSET_DIR = path.join(REPORT_DIR, "exact-public-images");
const REPORT_JSON = path.join(REPORT_DIR, "exact-public-images-report.json");
const REPORT_TXT = path.join(REPORT_DIR, "exact-public-images-report.txt");

const resolved = [
  {
    signalId: 16,
    name: "Rave Party Fever",
    provider: "PG",
    sourcePage: "https://casino.guru/free-casino-games/slots/rave-party-fever-slot-play-free",
    sourceUrl: "https://static.casino.guru/pict/989416/Rave-Party-Fever.jpg?imageDataId=1044054&timestamp=1729855096000&width=838",
  },
  {
    signalId: 18,
    name: "Fruity Candy",
    provider: "PG",
    sourcePage: "https://casino.guru/free-casino-games/slots/fruity-candy-slot-play-free",
    sourceUrl: "https://static.casino.guru/pict/989200/Fruity-Candy.jpg?imageDataId=1043723&timestamp=1729854921000&width=838",
  },
  {
    signalId: 59,
    name: "Secrets of Cleopatra",
    provider: "PG",
    sourcePage: "https://casino.guru/free-casino-games/slots/secrets-of-cleopatra-slot-play-free",
    sourceUrl: "https://static.casino.guru/pict/184993/Secrets-of-Cleopatra.jpg?imageDataId=212076&timestamp=1653448567000&width=838",
  },
  {
    signalId: 61,
    name: "Medusa",
    provider: "PG",
    sourcePage: "https://casino.guru/free-casino-games/slots/medusa-slot-play-free-1",
    sourceUrl: "https://static.casino.guru/pict/96914/Medusa.jpg?imageDataId=1497&timestamp=1653383107000&width=838",
  },
  {
    signalId: 86,
    name: "Egypt's Book of Mystery",
    provider: "PG",
    sourcePage: "https://casino.guru/free-casino-games/slots/egypt-s-book-of-mystery-slot-play-free",
    sourceUrl: "https://static.casino.guru/pict/989146/Egypt-s-Book-of-Mystery.jpg?imageDataId=1043641&timestamp=1729854886000&width=838",
  },
  {
    signalId: 220,
    name: "Lucky Clover Lady",
    provider: "PG",
    sourcePage: "https://casino.guru/free-casino-games/slots/lucky-clover-lady-slot-play-free",
    sourceUrl: "https://static.casino.guru/pict/989299/Lucky-Clover-Lady.jpg?imageDataId=1043877&timestamp=1729854989000&width=838",
  },
];

const unresolved = [
  { signalId: 8, name: "Muay Thai", provider: "PG", reason: "Somente Muay Thai Champion (PG Soft) ou Muay Thai de outro provedor foi localizado; título/provedor exatos não encontrados." },
  { signalId: 21, name: "Roost Rumble", provider: "PG", reason: "Somente Rooster Rumble foi localizado; variante de nome rejeitada." },
  { signalId: 119, name: "Medusa 2", provider: "PG", reason: "Somente Medusa II (PG Soft) e Medusa 2 HQ (outro provedor) foram localizados; variantes rejeitadas." },
  { signalId: 162, name: "Super Market", provider: "PG", reason: "Somente Super Market Spree foi localizado; variante de nome rejeitada." },
  { signalId: 165, name: "Sugar Hush", provider: "PP", reason: "Nenhum catálogo público confirmou Sugar Hush da Pragmatic Play; Sugar Rush foi rejeitado." },
  { signalId: 168, name: "Dragon Tiger", provider: "PG", reason: "Somente Dragon Tiger Luck foi confirmado pela PG Soft; variante de nome rejeitada." },
];

function publicUrl(storagePath) {
  return `${PROJECT_ORIGIN}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}

function writeReport(report) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "IMPORTAÇÃO DE IMAGENS PÚBLICAS EXATAS",
    `Gerado em: ${report.generatedAt}`,
    `Modo: ${report.mode}`,
    `Resolvidos: ${report.counts.resolved}`,
    `Pendentes: ${report.counts.unresolved}`,
    `Uploads: ${report.counts.uploads}`,
    "",
    "RESOLVIDOS",
    ...report.resolved.map((item) => `- #${item.signalId} ${item.name} (${item.provider}) | ${item.status} | SHA-256 ${item.hash} | ${item.coverUrl}`),
    "",
    "PENDENTES",
    ...report.unresolved.map((item) => `- #${item.signalId} ${item.name} (${item.provider}): ${item.reason}`),
  ];
  fs.writeFileSync(REPORT_TXT, `${lines.join("\n")}\n`);
}

async function prepareOne(item) {
  const downloaded = await downloadRemoteImage(item.sourceUrl, { allowlist: ["static.casino.guru"] });
  const metadata = await sharp(downloaded.body).metadata();
  const extension = extensionForContentType(downloaded.contentType);
  const prefix = downloaded.hash.slice(0, 16);
  const directory = path.join(ASSET_DIR, String(item.signalId), prefix);
  fs.mkdirSync(directory, { recursive: true });
  const originalName = `original.${extension}`;
  const originalPath = path.join(directory, originalName);
  const coverPath = path.join(directory, "cover.jpg");
  const iconPath = path.join(directory, "icon.png");
  fs.writeFileSync(originalPath, downloaded.body);
  await sharp(downloaded.body).rotate().resize(540, 330, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0 },
  }).jpeg({ quality: 88, progressive: true }).toFile(coverPath);
  await sharp(downloaded.body).rotate().resize(186, 186, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png({ compressionLevel: 9 }).toFile(iconPath);

  const storageBase = `signals/exact/${item.signalId}/${prefix}`;
  return {
    ...item,
    status: "prepared",
    httpStatus: 200,
    contentType: downloaded.contentType,
    bytes: downloaded.bytes,
    hash: downloaded.hash,
    width: metadata.width,
    height: metadata.height,
    files: [
      { kind: "original", localPath: originalPath, storagePath: `${storageBase}/${originalName}`, contentType: downloaded.contentType },
      { kind: "cover", localPath: coverPath, storagePath: `${storageBase}/cover.jpg`, contentType: "image/jpeg" },
      { kind: "icon", localPath: iconPath, storagePath: `${storageBase}/icon.png`, contentType: "image/png" },
    ],
    coverUrl: publicUrl(`${storageBase}/cover.jpg`),
    iconUrl: publicUrl(`${storageBase}/icon.png`),
  };
}

async function uploadFile(client, file) {
  const existing = await fetch(publicUrl(file.storagePath), { method: "HEAD" });
  if (existing.status === 200) return "reused";
  const body = fs.readFileSync(file.localPath);
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(file.storagePath, body, {
    contentType: file.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Upload ${file.storagePath}: ${error.message}`);
  const confirmed = await fetch(publicUrl(file.storagePath));
  if (confirmed.status !== 200 || !(confirmed.headers.get("content-type") ?? "").startsWith("image/")) {
    throw new Error(`Objeto não confirmado no Storage: ${file.storagePath}`);
  }
  return "uploaded";
}

async function apply(items) {
  const env = loadEnv();
  const { client } = createAdminClient(env);
  const ids = [...resolved, ...unresolved].map((item) => item.signalId);
  const { data: before, error } = await client.from("sinais").select("id,nome_jogo,categoria_jogo,imagem_url,cor_background,bets,ativo,created_at").in("id", ids).order("id");
  if (error) throw error;
  if ((before ?? []).length !== ids.length) throw new Error("Auditoria recusada: os 12 sinais não foram encontrados");
  for (const expected of [...resolved, ...unresolved]) {
    const actual = before.find((row) => Number(row.id) === expected.signalId);
    if (actual?.nome_jogo !== expected.name || actual?.categoria_jogo !== expected.provider) {
      throw new Error(`Identidade divergente no sinal ${expected.signalId}`);
    }
  }

  let uploads = 0;
  for (const item of items) {
    for (const file of item.files) if (await uploadFile(client, file) === "uploaded") uploads += 1;
  }
  for (const item of items) {
    const { error: updateError } = await client.from("sinais").update({ imagem_url: item.coverUrl }).eq("id", item.signalId);
    if (updateError) throw updateError;
    item.status = "applied";
  }

  const { data: after, error: afterError } = await client.from("sinais").select("id,nome_jogo,categoria_jogo,imagem_url,cor_background,bets,ativo,created_at").in("id", ids).order("id");
  if (afterError) throw afterError;
  const beforeById = new Map(before.map((row) => [Number(row.id), row]));
  for (const row of after) {
    const old = beforeById.get(Number(row.id));
    const allowed = items.some((item) => item.signalId === Number(row.id));
    for (const key of Object.keys(row)) {
      if (key === "imagem_url" && allowed) continue;
      if (JSON.stringify(row[key]) !== JSON.stringify(old[key])) throw new Error(`Campo protegido alterado: sinais.${key} id ${row.id}`);
    }
    if (!allowed && row.imagem_url !== old.imagem_url) throw new Error(`Sinal pendente alterado: ${row.id}`);
  }
  return { uploads, before, after };
}

async function main() {
  if (currentBranch() !== EXPECTED_BRANCH) throw new Error(`Branch recusada: ${currentBranch() || "desconhecida"}`);
  const confirm = process.argv.includes("--confirm");
  fs.mkdirSync(ASSET_DIR, { recursive: true });
  const prepared = [];
  for (const item of resolved) prepared.push(await prepareOne(item));
  let applyResult = { uploads: 0 };
  if (confirm) applyResult = await apply(prepared);
  const report = {
    generatedAt: new Date().toISOString(),
    branch: currentBranch(),
    mode: confirm ? "apply" : "prepare",
    strategy: "exact-title-and-provider-only; no similarity; no legacy IDs",
    counts: { requested: 12, resolved: prepared.length, unresolved: unresolved.length, uploads: applyResult.uploads },
    resolved: prepared,
    unresolved,
    protectedFields: ["nome_jogo", "categoria_jogo", "cor_background", "bets", "ativo", "created_at"],
    databaseBefore: applyResult.before ?? null,
    databaseAfter: applyResult.after ?? null,
  };
  report.fingerprint = crypto.createHash("sha256").update(JSON.stringify({ resolved: report.resolved.map(({ signalId, hash }) => ({ signalId, hash })), unresolved })).digest("hex");
  writeReport(report);
  console.log(JSON.stringify({ report: path.relative(ROOT, REPORT_JSON), ...report.counts }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
