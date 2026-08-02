import type { SiteSectionConfig, SiteSectionId } from "@/lib/signals/types";

export const DEFAULT_SITE_SECTIONS: SiteSectionConfig[] = [
  { id: "banner", label: "Banner", ativo: true, ordem: 0 },
  { id: "plataformas", label: "Plataformas", ativo: true, ordem: 1 },
  { id: "distribuicoes", label: "Maiores distribuições", ativo: true, ordem: 2 },
  { id: "busca", label: "Busca", ativo: true, ordem: 3 },
  { id: "catalogo", label: "Catálogo", ativo: true, ordem: 4 },
  { id: "cta_whatsapp", label: "CTA WhatsApp", ativo: true, ordem: 5 },
  { id: "footer", label: "Footer", ativo: true, ordem: 6 },
];

const sectionIds = new Set<SiteSectionId>(DEFAULT_SITE_SECTIONS.map((section) => section.id));

export function normalizeSiteSections(value: unknown): SiteSectionConfig[] {
  const incoming = Array.isArray(value) ? value : [];
  const byId = new Map(
    incoming
      .filter((item): item is Partial<SiteSectionConfig> & { id: SiteSectionId } => (
        Boolean(item) && typeof item === "object" && sectionIds.has((item as { id: SiteSectionId }).id)
      ))
      .map((item) => [item.id, item]),
  );

  return DEFAULT_SITE_SECTIONS.map((fallback) => {
    const item = byId.get(fallback.id);
    return {
      ...fallback,
      ativo: typeof item?.ativo === "boolean" ? item.ativo : fallback.ativo,
      ordem: Number.isFinite(Number(item?.ordem)) ? Number(item?.ordem) : fallback.ordem,
    };
  }).sort((left, right) => left.ordem - right.ordem);
}
