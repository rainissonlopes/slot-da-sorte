import { existingSignalIdentity } from "./supabase.mjs";
import { extensionForContentType } from "./images.mjs";

const PROTECTED_SIGNAL_FIELDS = ["bets", "cor_background", "favorito", "destaque", "ordem", "ativo", "link", "visibilidade"];

export function matchExistingGames(games, signalRows) {
  const existing = signalRows.map(existingSignalIdentity);
  const exact = new Map();
  const fallback = new Map();
  for (const row of existing) {
    if (row.provider_normalized && row.external_id) {
      const key = `${row.provider_normalized}:${row.external_id}`;
      exact.set(key, [...(exact.get(key) ?? []), row]);
    }
    if (row.provider_normalized && row.name_normalized) {
      const key = `${row.provider_normalized}:${row.name_normalized}`;
      fallback.set(key, [...(fallback.get(key) ?? []), row]);
    }
  }
  return games.map((game) => {
    const exactRows = (exact.get(`${game.provider_normalized}:${game.external_id}`) ?? [])
      .filter((row) => row.name_normalized === game.name_normalized);
    if (exactRows.length === 1) return { game, type: "exact", signal: exactRows[0] };
    if (exactRows.length > 1) return { game, type: "ambiguous", candidates: exactRows.map((row) => row.id), reason: "external_id" };
    const fallbackRows = fallback.get(`${game.provider_normalized}:${game.name_normalized}`) ?? [];
    if (fallbackRows.length === 1) return { game, type: "fallback", signal: fallbackRows[0] };
    if (fallbackRows.length > 1) return { game, type: "ambiguous", candidates: fallbackRows.map((row) => row.id), reason: "name" };
    return { game, type: "new" };
  });
}

export function preserveManualFields(current, technicalPatch) {
  const safe = { ...technicalPatch };
  for (const field of PROTECTED_SIGNAL_FIELDS) delete safe[field];
  if (current?.isManualImage) delete safe.imagem_url;
  return safe;
}

export function buildPlan(games, signalRows, imageAudit, supabaseUrl) {
  const matches = matchExistingGames(games, signalRows);
  const validImages = new Map(imageAudit.items.filter((item) => item.valid).map((item) => [item.key, item]));
  const exact = matches.filter((item) => item.type === "exact");
  const fallback = matches.filter((item) => item.type === "fallback");
  const ambiguous = matches.filter((item) => item.type === "ambiguous");
  const added = matches.filter((item) => item.type === "new");
  const uploads = [...validImages.values()].map((item) => ({
    key: item.key,
    path: item.path.replace(/\.[a-z0-9]+$/i, `.${extensionForContentType(item.contentType)}`),
    sourceUrl: item.finalUrl,
    hash: item.hash,
    bytes: item.bytes,
    contentType: item.contentType,
  }));
  const matchUpdates = [...exact, ...fallback].map((item) => ({
    signalId: item.signal.id,
    matchType: item.type,
    protectedFields: PROTECTED_SIGNAL_FIELDS,
    imagePolicy: item.signal.isManualImage ? "preserve-manual" : "replace-after-confirmed-upload",
  }));
  return {
    matches,
    summary: {
      exactMatches: exact.length,
      fallbackMatches: fallback.length,
      ambiguousMatches: ambiguous.length,
      newGames: added.length,
      signalRecordsPlannedForTechnicalUpdate: matchUpdates.filter((item) => item.imagePolicy !== "preserve-manual").length,
      signalRecordsPreserved: signalRows.length - matchUpdates.filter((item) => item.imagePolicy !== "preserve-manual").length,
      uploadsPlanned: uploads.length,
      uniqueDownloadsPlanned: imageAudit.uniqueUrls,
      reusableByDuplicateHash: imageAudit.duplicateHashes.reduce((sum, item) => sum + item.count - 1, 0),
    },
    ambiguous: ambiguous.map((item) => ({ key: `${item.game.provider_normalized}:${item.game.external_id}`, candidates: item.candidates, reason: item.reason })),
    newGames: added.map((item) => ({ external_id: item.game.external_id, provider: item.game.provider_normalized, name: item.game.name })),
    updates: matchUpdates,
    uploads,
    bucket: { name: "games", publicForFrontendAssets: true, paths: "{provider}/{external_id}/{cover|icon}.{detected-extension}" },
    migrationsProposed: [
      "Criar public.games para identidade/mídia, com UNIQUE(source, provider_normalized, external_id), RLS e SELECT público explícito.",
      "Criar bucket público games somente para leitura dos assets; uploads e alterações ficam restritos à credencial administrativa.",
      "Adicionar vínculo opcional sinais.game_id somente após auditoria administrativa de constraints/duplicidades; não é necessário para o primeiro upload.",
    ],
    conflictResolution: {
      pg126: "Hawaiian Tiki is imported as its own game; mismatched numeric claims are ignored during matching.",
      signal1: "Fortune Tiger matches pg:2 by provider and normalized name.",
      signal37: "Honey Trap of Diao Chan remains unmatched and preserved; its legacy numeric image claim is cleared during apply.",
    },
    supabaseUrlConfigured: Boolean(supabaseUrl),
  };
}
