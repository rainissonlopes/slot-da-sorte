import dns from "node:dns/promises";
import net from "node:net";
import { MAX_REDIRECTS, SOURCE_ORIGIN } from "./config.mjs";

const ALLOWED_IMAGE_HOSTS = ["reidoslotsinais.org", "imagedelivery.net"];

export function isPrivateAddress(address) {
  const value = address.toLowerCase().split("%")[0];
  if (net.isIPv4(value)) {
    const [a, b] = value.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (net.isIPv6(value)) {
    return value === "::" || value === "::1" || value.startsWith("fc") ||
      value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") ||
      value.startsWith("fea") || value.startsWith("feb") || value.startsWith("::ffff:127.") ||
      value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
  }
  return true;
}

function hostAllowed(hostname, allowlist) {
  return allowlist.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export async function assertPublicUrl(rawUrl, options = {}) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Protocolo não permitido: ${url.protocol}`);
  if (url.username || url.password) throw new Error("Credenciais embutidas na URL não são permitidas");
  const allowlist = options.allowlist ?? ALLOWED_IMAGE_HOSTS;
  if (!hostAllowed(url.hostname.toLowerCase(), allowlist)) throw new Error(`Host não autorizado: ${url.hostname}`);
  const lookup = options.lookup ?? dns.lookup;
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error(`Host resolveu para endereço privado ou inválido: ${url.hostname}`);
  }
  return url;
}

export async function fetchWithPolicy(rawUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const allowlist = options.allowlist;
  let current = String(rawUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicUrl(current, { allowlist, lookup: options.lookup });
    const response = await fetch(current, {
      ...options.fetchOptions,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect ${response.status} sem Location`);
      current = new URL(location, current).toString();
      continue;
    }
    return { response, finalUrl: current, redirects };
  }
  throw new Error(`Mais de ${MAX_REDIRECTS} redirects`);
}

export async function fetchSource(pathname, options = {}) {
  const url = new URL(pathname, SOURCE_ORIGIN).toString();
  const attempts = options.attempts ?? 3;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { response, finalUrl } = await fetchWithPolicy(url, {
        allowlist: [new URL(SOURCE_ORIGIN).hostname],
        timeoutMs: options.timeoutMs ?? 20_000,
        fetchOptions: options.fetchOptions,
      });
      return { response, finalUrl, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
