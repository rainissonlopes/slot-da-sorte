import type { CSSProperties } from "react";

const GAME_THEME_COLOR_PATTERN = /^#[0-9A-F]{6}$/;
const LEGACY_RGB_COLOR_PATTERN = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
const LEGACY_RGBA_COLOR_PATTERN = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(?:1(?:\.0+)?|255)\s*\)$/i;

type GameThemeColorCandidates = {
  signalColor?: unknown;
  gameThemeColor?: unknown;
};

export function normalizeGameThemeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return GAME_THEME_COLOR_PATTERN.test(normalized) ? normalized : null;
}

export function isValidGameThemeColor(value: unknown): value is string {
  return normalizeGameThemeColor(value) !== null;
}

export function normalizeLegacySignalColor(value: unknown): string | null {
  const hexadecimal = normalizeGameThemeColor(value);
  if (hexadecimal) return hexadecimal;
  if (typeof value !== "string") return null;

  const match = value.trim().match(LEGACY_RGB_COLOR_PATTERN) || value.trim().match(LEGACY_RGBA_COLOR_PATTERN);
  if (!match) return null;

  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function resolveGameThemeColor({ signalColor, gameThemeColor }: GameThemeColorCandidates): string | null {
  return normalizeGameThemeColor(gameThemeColor) || normalizeLegacySignalColor(signalColor);
}

export function getGameThemeStyle(value: unknown): CSSProperties | undefined {
  const color = normalizeGameThemeColor(value);
  if (!color) return undefined;
  return { "--game-theme": color } as CSSProperties;
}
