import { loadBaseline } from "./config.mjs";
import { normalizeGame } from "./normalize.mjs";

export function findDuplicates(games) {
  const groups = new Map();
  for (const game of games) {
    const key = `${game.provider_normalized}:${game.external_id}`;
    groups.set(key, [...(groups.get(key) ?? []), game]);
  }
  return [...groups.entries()].filter(([, values]) => values.length > 1)
    .map(([key, values]) => ({ key, count: values.length, names: values.map((value) => value.name) }));
}

export function validateCollectedCatalog(collected, flags = new Set()) {
  const baseline = loadBaseline();
  const routeByProvider = new Map(collected.routes.map((route) => [route.provider, route]));
  const home = routeByProvider.get("all");
  if (!home) throw new Error("Coleta da home ausente");
  const normalized = home.games.map(normalizeGame);
  const duplicates = findDuplicates(normalized);
  const incompatibleIds = [];
  const idProviders = new Map();
  for (const game of normalized) {
    const providers = idProviders.get(game.external_id) ?? new Set();
    providers.add(game.provider_normalized);
    idProviders.set(game.external_id, providers);
  }
  for (const [externalId, providers] of idProviders) {
    if (providers.size > 1) incompatibleIds.push({ externalId, providers: [...providers] });
  }
  const counts = { total: normalized.length };
  for (const provider of ["pg", "pp", "tada", "wg"]) counts[provider] = routeByProvider.get(provider)?.games.length ?? 0;
  const categoryKeys = new Set(SOURCE_ROUTES_SAFE());
  const homeByProvider = Object.fromEntries([...categoryKeys].map((provider) => [provider, normalized.filter((game) => game.provider_normalized === provider).length]));
  const categoryMismatch = [...categoryKeys].filter((provider) => counts[provider] !== homeByProvider[provider]);
  const sum = counts.pg + counts.pp + counts.tada + counts.wg;
  const changes = {
    total: counts.total - baseline.total,
    providers: Object.fromEntries([...categoryKeys].map((provider) => [provider, counts[provider] - baseline.providers[provider]])),
  };
  const baselineChanged = changes.total !== 0 || Object.values(changes.providers).some(Boolean);
  const errors = [];
  if (duplicates.length) errors.push(`${duplicates.length} chaves externas duplicadas`);
  if (incompatibleIds.length) errors.push(`${incompatibleIds.length} IDs usados por providers incompatíveis`);
  if (sum !== counts.total) errors.push(`Soma das categorias ${sum} difere da home ${counts.total}`);
  if (categoryMismatch.length) errors.push(`Rotas de categoria divergem da home: ${categoryMismatch.join(", ")}`);
  if (baselineChanged && !flags.has("--accept-baseline")) errors.push("Contagens diferem da baseline; revise e use --accept-baseline explicitamente");
  if (errors.length) throw Object.assign(new Error(errors.join("; ")), { validation: { counts, homeByProvider, changes, duplicates, incompatibleIds } });
  return { normalized, counts, homeByProvider, changes, duplicates, incompatibleIds, baselineChanged, baselineAcceptedForRun: baselineChanged && flags.has("--accept-baseline") };
}

function SOURCE_ROUTES_SAFE() {
  return ["pg", "pp", "tada", "wg"];
}

export async function collectAllPages(fetchPage, initial) {
  const games = [...initial.games];
  let hasMore = initial.hasMore;
  const seen = new Set([initial.games.map((game) => game.id).join(",")]);
  let page = 2;
  while (hasMore) {
    if (page > 30) throw new Error("Limite defensivo de páginas excedido");
    const result = await fetchPage(page);
    const signature = result.games.map((game) => game.id).join(",");
    if (signature && seen.has(signature)) throw new Error("Loop de paginação detectado");
    if (result.hasMore && result.games.length === 0) throw new Error("Página parcial/vazia");
    seen.add(signature);
    games.push(...result.games);
    hasMore = result.hasMore;
    page += 1;
  }
  return games;
}
