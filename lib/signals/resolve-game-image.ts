export const GAME_IMAGE_PLACEHOLDER = "/placeholder-game.webp";

export type ResolveGameImageInput = {
  storageImageUrl?: string | null;
  storageIconUrl?: string | null;
  rawImageUrl?: string | null;
  legacyImageUrl?: string | null;
  manualImageOverride?: boolean;
  gameId: string | number;
  category?: string | null;
};

export type ResolvedGameImageSource = "manual" | "catalog-cover" | "catalog-icon" | "legacy" | "placeholder";

function isValidAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isGameStorageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname.endsWith(".supabase.co")
      && url.pathname.includes("/storage/v1/object/public/games/");
  } catch {
    return false;
  }
}

function isSafeImageSource(value: string) {
  if (!value || value === GAME_IMAGE_PLACEHOLDER || /^\/?\d+$/.test(value)) return false;
  return isValidAbsoluteUrl(value) || value.startsWith("/");
}

export function buildGameImageCandidates({
  storageImageUrl,
  storageIconUrl,
  rawImageUrl,
  legacyImageUrl,
  manualImageOverride,
}: ResolveGameImageInput): string[] {
  const cover = storageImageUrl?.trim() || "";
  const icon = storageIconUrl?.trim() || "";
  const raw = rawImageUrl?.trim() || "";
  const legacy = legacyImageUrl?.trim() || "";
  return [...new Set([
    manualImageOverride && isSafeImageSource(raw) ? raw : "",
    isGameStorageUrl(cover) ? cover : "",
    isGameStorageUrl(icon) ? icon : "",
    !manualImageOverride && isSafeImageSource(raw) ? raw : "",
    isSafeImageSource(legacy) ? legacy : "",
    GAME_IMAGE_PLACEHOLDER,
  ].filter(Boolean))];
}

export function resolveGameImage(input: ResolveGameImageInput): string {
  return buildGameImageCandidates(input)[0] ?? GAME_IMAGE_PLACEHOLDER;
}

export function resolveGameImageSource(input: ResolveGameImageInput): ResolvedGameImageSource {
  const resolved = resolveGameImage(input);
  const raw = input.rawImageUrl?.trim() || "";
  if (input.manualImageOverride && isSafeImageSource(raw) && resolved === raw) return "manual";
  if (input.storageImageUrl?.trim() === resolved && isGameStorageUrl(resolved)) return "catalog-cover";
  if (input.storageIconUrl?.trim() === resolved && isGameStorageUrl(resolved)) return "catalog-icon";
  if (resolved !== GAME_IMAGE_PLACEHOLDER) return "legacy";
  return "placeholder";
}

export function applyGameImageFallback(image: HTMLImageElement, candidates: string[] = [GAME_IMAGE_PLACEHOLDER]) {
  if (image.dataset.gameImageFallbackComplete === "true") return;
  image.dataset.gameImageFallbackComplete = "true";
  image.dataset.gameImageCandidateIndex = String(Math.max(0, candidates.indexOf(GAME_IMAGE_PLACEHOLDER)));
  if (image.src !== GAME_IMAGE_PLACEHOLDER) image.src = GAME_IMAGE_PLACEHOLDER;
}
