import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const REPORT_DIR = path.join(ROOT, ".tmp", "sync-games");
export const SOURCE_ORIGIN = "https://reidoslotsinais.org";
export const SOURCE_ROUTES = [
  { provider: "all", category: null, route: "/" },
  { provider: "pg", category: "PG", route: "/pg-soft" },
  { provider: "pp", category: "PP", route: "/pragmatic" },
  { provider: "tada", category: "TADA", route: "/tada-gaming" },
  { provider: "wg", category: "WG", route: "/wg-games" },
];
export const MAX_PAGES = 30;
export const PAGE_SIZE = 20;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_REDIRECTS = 4;
export const PREVIEW_MAX_AGE_MS = 2 * 60 * 60 * 1000;
export const EXPECTED_BRANCH = "feature/redesign-public-signals";
export const STORAGE_BUCKET = "games";

export function loadBaseline() {
  return JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "baseline.json"), "utf8"));
}

export function loadEnv() {
  const values = { ...process.env };
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const split = trimmed.indexOf("=");
    const key = trimmed.slice(0, split).trim();
    const value = trimmed.slice(split + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in values)) values[key] = value;
  }
  return values;
}

export function parseFlags(args) {
  return new Set(args.filter((arg) => arg.startsWith("--")));
}
