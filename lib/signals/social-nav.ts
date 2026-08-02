import type { ConfigSite, SocialNavId, SocialNavItemConfig } from "./types.ts";

type JsonObject = Record<string, unknown>;

const DEFAULT_SOCIAL_NAV: SocialNavItemConfig[] = [
  { id: "home", label: "Home", url: "/", enabled: true, order: 0, highlighted: false },
  { id: "instagram", label: "Instagram", url: "", enabled: false, order: 1, highlighted: false },
  { id: "telegram", label: "Telegram", url: "", enabled: false, order: 2, highlighted: false },
  { id: "tiktok", label: "TikTok", url: "", enabled: false, order: 3, highlighted: false },
  { id: "whatsapp_vip", label: "WhatsApp VIP", url: "", enabled: false, order: 4, highlighted: true },
];

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function normalizeSocialUrl(value: unknown, id: SocialNavId) {
  if (id === "home") return "/";
  if (typeof value !== "string" || !value.trim()) return "";
  if (id === "whatsapp_vip") {
    const digits = value.replace(/\D/g, "");
    if (/^\d{8,15}$/.test(digits)) return `https://wa.me/${digits}`;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function resolveSocialNav(config: ConfigSite | null | undefined): SocialNavItemConfig[] {
  const configV2 = asObject(config?.config_v2);
  const configuredItems = Array.isArray(configV2.social_nav) ? configV2.social_nav : [];
  const configuredById = new Map(
    configuredItems
      .filter((item) => item !== null && typeof item === "object" && typeof (item as JsonObject).id === "string")
      .map((item) => [String((item as JsonObject).id), asObject(item)]),
  );
  const legacyUrls: Partial<Record<SocialNavId, string>> = {
    instagram: config?.instagram || "",
    telegram: config?.telegram || "",
    whatsapp_vip: config?.whatsapp || "",
  };

  return DEFAULT_SOCIAL_NAV.map((defaults) => {
    const configured = configuredById.get(defaults.id) || {};
    const url = normalizeSocialUrl(configured.url ?? legacyUrls[defaults.id] ?? defaults.url, defaults.id);
    const label = typeof configured.label === "string" ? configured.label.trim() : "";
    const order = typeof configured.order === "number" && Number.isFinite(configured.order) ? configured.order : defaults.order;
    return {
      id: defaults.id,
      label: label || defaults.label,
      url,
      enabled: typeof configured.enabled === "boolean" ? configured.enabled : defaults.id === "home" || Boolean(url),
      order,
      highlighted: typeof configured.highlighted === "boolean" ? configured.highlighted : defaults.highlighted,
    };
  }).sort((a, b) => a.order - b.order);
}

export function mergeSocialNav(current: unknown, items: SocialNavItemConfig[]) {
  const currentItems = Array.isArray(current) ? current : [];
  const currentById = new Map(
    currentItems
      .filter((item) => item !== null && typeof item === "object" && typeof (item as JsonObject).id === "string")
      .map((item) => [String((item as JsonObject).id), asObject(item)]),
  );
  const knownIds = new Set(items.map((item) => item.id));
  const unknownItems = currentItems.filter((item) => {
    const id = item !== null && typeof item === "object" ? (item as JsonObject).id : undefined;
    return typeof id !== "string" || !knownIds.has(id as SocialNavId);
  });

  return [
    ...items.map((item) => ({ ...currentById.get(item.id), ...item })),
    ...unknownItems,
  ];
}
