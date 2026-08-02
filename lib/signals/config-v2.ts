import { normalizeSiteSections } from "@/lib/signals/site-sections";
import { mergeSocialNav, resolveSocialNav } from "@/lib/signals/social-nav";
import type { Aparencia, ConfigSite, SiteSectionConfig, SocialNavItemConfig } from "@/lib/signals/types";

export { resolveSocialNav } from "@/lib/signals/social-nav";

export type JsonObject = Record<string, unknown>;

export const DEFAULT_WHATSAPP_MESSAGE = "";
export const DEFAULT_HEADER_BUTTON_TEXT = "WhatsApp";
export const DEFAULT_CTA_TITLE = "Receba os sinais no WhatsApp";
export const DEFAULT_CTA_DESCRIPTION = "Entre no grupo e receba atualizações, jogos em alta e novos sinais.";
export const DEFAULT_CTA_BUTTON_TEXT = "Entrar no grupo";
export const DEFAULT_BUTTON_COLOR = "#00a63e";
export const DEFAULT_BACKGROUND_COLOR = "#050806";
export const DEFAULT_CARD_COLOR = "#101512";
export const DEFAULT_FOOTER_TEXT = "Sinais atualizados para ajudar você a encontrar os jogos mais interessantes do momento.";

export function asJsonObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function resolveAppearanceV2(appearance: Aparencia | null | undefined) {
  const raw = asJsonObject(appearance?.config_v2);
  const colors = asJsonObject(raw.colors);
  const footer = asJsonObject(raw.footer);
  const banner = asJsonObject(raw.banner);

  return {
    raw,
    buttonColor: stringValue(colors.buttons, DEFAULT_BUTTON_COLOR),
    backgroundColor: stringValue(colors.background, DEFAULT_BACKGROUND_COLOR),
    cardColor: stringValue(colors.cards, DEFAULT_CARD_COLOR),
    footerText: stringValue(footer.text, DEFAULT_FOOTER_TEXT),
    bannerUrl: stringValue(banner.url, appearance?.banner_principal_url || ""),
    bannerLink: stringValue(banner.link),
    bannerActive: booleanValue(banner.active, true),
  };
}

export function mergeAppearanceV2(
  current: unknown,
  values: {
    buttonColor: string;
    backgroundColor: string;
    cardColor: string;
    footerText: string;
    bannerUrl: string;
    bannerLink: string;
    bannerActive: boolean;
  },
) {
  const raw = asJsonObject(current);
  return {
    ...raw,
    colors: {
      ...asJsonObject(raw.colors),
      buttons: values.buttonColor,
      background: values.backgroundColor,
      cards: values.cardColor,
    },
    footer: {
      ...asJsonObject(raw.footer),
      text: values.footerText,
    },
    banner: {
      ...asJsonObject(raw.banner),
      url: values.bannerUrl,
      link: values.bannerLink,
      active: values.bannerActive,
    },
  };
}

export function resolveSiteV2(config: ConfigSite | null | undefined) {
  const raw = asJsonObject(config?.config_v2);
  const whatsapp = asJsonObject(raw.whatsapp);
  const header = asJsonObject(raw.header);
  const cta = asJsonObject(raw.cta);

  return {
    raw,
    whatsappNumber: stringValue(whatsapp.number, config?.whatsapp || ""),
    whatsappMessage: stringValue(whatsapp.message, DEFAULT_WHATSAPP_MESSAGE),
    headerButtonText: stringValue(header.button_text, DEFAULT_HEADER_BUTTON_TEXT),
    headerActive: booleanValue(header.active, true),
    ctaTitle: stringValue(cta.title, DEFAULT_CTA_TITLE),
    ctaDescription: stringValue(cta.description, DEFAULT_CTA_DESCRIPTION),
    ctaButtonText: stringValue(cta.button_text, DEFAULT_CTA_BUTTON_TEXT),
    ctaActive: booleanValue(cta.active, true),
    sections: normalizeSiteSections(raw.sections),
    socialNav: resolveSocialNav(config),
  };
}

function mergeSections(current: unknown, sections: SiteSectionConfig[]) {
  const currentSections = Array.isArray(current) ? current : [];
  const currentById = new Map(
    currentSections
      .filter((item) => item !== null && typeof item === "object" && typeof (item as JsonObject).id === "string")
      .map((item) => [String((item as JsonObject).id), asJsonObject(item)]),
  );
  const knownIds = new Set(sections.map((section) => section.id));
  const unknownSections = currentSections.filter((item) => {
    const id = item !== null && typeof item === "object" ? (item as JsonObject).id : undefined;
    return typeof id !== "string" || !knownIds.has(id as SiteSectionConfig["id"]);
  });

  return [
    ...sections.map(({ id, ativo, ordem }) => ({
      ...currentById.get(id),
      id,
      ativo,
      ordem,
    })),
    ...unknownSections,
  ];
}

export function mergeSiteV2(
  current: unknown,
  values: {
    whatsappNumber: string;
    whatsappMessage: string;
    headerButtonText: string;
    headerActive: boolean;
    ctaTitle: string;
    ctaDescription: string;
    ctaButtonText: string;
    ctaActive: boolean;
    sections: SiteSectionConfig[];
    socialNav: SocialNavItemConfig[];
  },
) {
  const raw = asJsonObject(current);
  return {
    ...raw,
    whatsapp: {
      ...asJsonObject(raw.whatsapp),
      number: values.whatsappNumber,
      message: values.whatsappMessage,
    },
    header: {
      ...asJsonObject(raw.header),
      button_text: values.headerButtonText,
      active: values.headerActive,
    },
    cta: {
      ...asJsonObject(raw.cta),
      title: values.ctaTitle,
      description: values.ctaDescription,
      button_text: values.ctaButtonText,
      active: values.ctaActive,
    },
    sections: mergeSections(raw.sections, values.sections),
    social_nav: mergeSocialNav(raw.social_nav, values.socialNav),
  };
}
