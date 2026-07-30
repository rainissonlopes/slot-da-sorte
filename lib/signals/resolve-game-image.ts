export const GAME_IMAGE_PLACEHOLDER = "/placeholder-game.webp";

type ResolveGameImageInput = {
  rawImageUrl?: string | null;
  gameId: string | number;
  category?: string | null;
};

const CATEGORY_PATHS: Record<string, string> = {
  PG: "games-pg",
  "PG GAMES": "games-pg",
  "PG SOFT": "games-pg",
  PP: "games-pp",
  "PP GAMES": "games-pp",
  PRAGMATIC: "games-pp",
  WG: "games-wg",
  "WG GAMES": "games-wg",
  TADA: "games-tada",
};

function normalizeCategory(category?: string | null) {
  return category?.trim().replace(/\s+/g, " ").toUpperCase() || "";
}

function isValidAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolveGameImage({ rawImageUrl, gameId, category }: ResolveGameImageInput): string {
  const rawValue = rawImageUrl?.trim() || "";

  if (isValidAbsoluteUrl(rawValue)) return rawValue;
  if (rawValue.startsWith("/")) return rawValue;

  const imageId = /^\d+$/.test(rawValue) ? rawValue : String(gameId).trim();
  if (!/^\d+$/.test(imageId) || (rawValue && !/^\d+$/.test(rawValue))) {
    return GAME_IMAGE_PLACEHOLDER;
  }

  const categoryPath = CATEGORY_PATHS[normalizeCategory(category)];
  if (!categoryPath) return GAME_IMAGE_PLACEHOLDER;

  return `https://reidoslotsinais.org/image/${categoryPath}/${imageId}.webp`;
}

export function applyGameImageFallback(image: HTMLImageElement) {
  if (image.dataset.gameImageFallback === "true") return;

  image.dataset.gameImageFallback = "true";
  image.src = GAME_IMAGE_PLACEHOLDER;
}
