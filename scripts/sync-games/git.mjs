import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.mjs";

export function currentBranch() {
  const gitPath = path.join(ROOT, ".git");
  const headPath = fs.statSync(gitPath).isDirectory()
    ? path.join(gitPath, "HEAD")
    : path.resolve(ROOT, fs.readFileSync(gitPath, "utf8").trim().replace(/^gitdir:\s*/, ""), "HEAD");
  const head = fs.readFileSync(headPath, "utf8").trim();
  const prefix = "ref: refs/heads/";
  return head.startsWith(prefix) ? head.slice(prefix.length) : "";
}
