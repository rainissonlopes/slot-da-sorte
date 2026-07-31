import { MAX_PAGES, PAGE_SIZE, SOURCE_ORIGIN, SOURCE_ROUTES } from "./config.mjs";
import { fetchSource } from "./network.mjs";

export function decodeFlightPayloads(html) {
  const values = [];
  const pattern = /<script>self\.__next_f\.push\((\[1,"(?:\\.|[^"\\])*"\])\)<\/script>/g;
  for (const match of html.matchAll(pattern)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (typeof parsed[1] === "string") values.push(parsed[1]);
    } catch {}
  }
  return values;
}

function extractBalanced(text, start, open, close) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === open) depth += 1;
    else if (char === close && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error("Payload RSC truncado ou desbalanceado");
}

export function extractInitialPage(html) {
  const candidates = [];
  for (const payload of decodeFlightPayloads(html)) {
    let cursor = 0;
    while ((cursor = payload.indexOf('"initialGames":', cursor)) !== -1) {
      const start = payload.indexOf("[", cursor);
      const json = extractBalanced(payload, start, "[", "]");
      const games = JSON.parse(json);
      if (Array.isArray(games) && games.every((game) => game && typeof game === "object")) {
        const tail = payload.slice(start + json.length, start + json.length + 250);
        const hasMore = /"initialHasMore":(true|false)/.exec(tail)?.[1] === "true";
        candidates.push({ games, hasMore });
      }
      cursor = start + json.length;
    }
  }
  const unique = new Map(candidates.map((item) => [JSON.stringify(item.games.map((game) => game.id)), item]));
  if (unique.size !== 1) throw new Error(`initialGames ausente ou ambíguo (${unique.size} candidatos)`);
  return [...unique.values()][0];
}

export function extractActionResult(body) {
  for (const line of body.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon < 1) continue;
    try {
      const value = JSON.parse(line.slice(colon + 1));
      if (value && Array.isArray(value.games) && typeof value.hasMore === "boolean") return value;
    } catch {}
  }
  throw new Error("Resposta da Server Action incompatível: games/hasMore não encontrados");
}

export async function discoverGetGames(html, logger) {
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)/g)].map((match) => match[1]);
  const candidates = [];
  for (const src of [...new Set(scripts)]) {
    const { response } = await fetchSource(src);
    if (!response.ok) throw new Error(`Bundle ${src} retornou HTTP ${response.status}`);
    const code = await response.text();
    const pattern = /createServerReference\)?\("([a-f0-9]{40,64})"[\s\S]{0,180}?"getGames"\)/g;
    for (const match of code.matchAll(pattern)) candidates.push({ id: match[1], bundle: src, method: "createServerReference/getGames" });
  }
  const unique = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (unique.size !== 1) throw new Error(`Descoberta de getGames ambígua: ${unique.size} referências`);
  const discovered = [...unique.values()][0];
  logger.info("Server Action getGames descoberta", { bundle: discovered.bundle, idPrefix: `${discovered.id.slice(0, 8)}…` });
  return discovered;
}

export async function fetchActionPage({ route, category, page, actionId }) {
  const { response, attempt } = await fetchSource(route, {
    fetchOptions: {
      method: "POST",
      headers: {
        Accept: "text/x-component",
        "Content-Type": "text/plain;charset=UTF-8",
        "next-action": actionId,
        Origin: SOURCE_ORIGIN,
        Referer: new URL(route, SOURCE_ORIGIN).toString(),
      },
      body: JSON.stringify([category, null, "all", page]),
    },
  });
  if (response.status !== 200) throw new Error(`${route} página ${page}: HTTP ${response.status}`);
  if (!(response.headers.get("content-type") ?? "").includes("text/x-component")) {
    throw new Error(`${route} página ${page}: content-type incompatível`);
  }
  return { ...extractActionResult(await response.text()), status: response.status, attempt };
}

export async function collectRoute(routeConfig, actionId, prefetchedHtml) {
  const htmlResponse = prefetchedHtml ? null : await fetchSource(routeConfig.route);
  if (htmlResponse && htmlResponse.response.status !== 200) throw new Error(`${routeConfig.route}: HTTP ${htmlResponse.response.status}`);
  const html = prefetchedHtml ?? await htmlResponse.response.text();
  const initial = extractInitialPage(html);
  const games = [...initial.games];
  const pages = [{ page: 1, count: initial.games.length, hasMore: initial.hasMore, status: 200 }];
  const signatures = new Set([initial.games.map((game) => game.id).join(",")]);
  let hasMore = initial.hasMore;
  for (let page = 2; hasMore; page += 1) {
    if (page > MAX_PAGES) throw new Error(`${routeConfig.route}: excedeu ${MAX_PAGES} páginas`);
    const result = await fetchActionPage({ ...routeConfig, page, actionId });
    if (result.games.length > PAGE_SIZE) throw new Error(`${routeConfig.route} página ${page}: mais de ${PAGE_SIZE} itens`);
    if (result.hasMore && result.games.length === 0) throw new Error(`${routeConfig.route} página ${page}: página vazia com hasMore=true`);
    const signature = result.games.map((game) => game.id).join(",");
    if (signature && signatures.has(signature)) throw new Error(`${routeConfig.route} página ${page}: loop de paginação detectado`);
    signatures.add(signature);
    games.push(...result.games);
    pages.push({ page, count: result.games.length, hasMore: result.hasMore, status: result.status, attempt: result.attempt });
    hasMore = result.hasMore;
  }
  if (pages.at(-1)?.hasMore !== false) throw new Error(`${routeConfig.route}: paginação não terminou com hasMore=false`);
  return { ...routeConfig, games, pages };
}

export async function collectCatalog(logger) {
  const startedAt = Date.now();
  const homeResponse = await fetchSource("/");
  if (homeResponse.response.status !== 200) throw new Error(`Home retornou HTTP ${homeResponse.response.status}`);
  const homeHtml = await homeResponse.response.text();
  const action = await discoverGetGames(homeHtml, logger);
  const validation = await fetchActionPage({ route: "/", category: null, page: 2, actionId: action.id });
  if (!validation.games.length) throw new Error("Validação de getGames retornou página vazia");
  const routes = [];
  for (const route of SOURCE_ROUTES) {
    logger.info("Coletando rota", { route: route.route });
    routes.push(await collectRoute(route, action.id, route.route === "/" ? homeHtml : null));
  }
  return { action, routes, durationMs: Date.now() - startedAt };
}
