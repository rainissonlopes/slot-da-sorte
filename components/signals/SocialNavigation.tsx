import { FaInstagram, FaTelegramPlane, FaTiktok } from "react-icons/fa";
import type { IconType } from "react-icons";
import type { SocialNavId, SocialNavItemConfig } from "@/lib/signals/types";

const ICONS: Partial<Record<SocialNavId, IconType>> = {
  instagram: FaInstagram,
  telegram: FaTelegramPlane,
  tiktok: FaTiktok,
};

const HEADER_SOCIAL_IDS: SocialNavId[] = ["instagram", "telegram", "tiktok"];

export function HeaderSocialLinks({ items, preview = false }: { items: SocialNavItemConfig[]; preview?: boolean }) {
  const visibleItems = HEADER_SOCIAL_IDS.flatMap((id) => {
    const item = items.find((candidate) => candidate.id === id && candidate.enabled && candidate.url.trim());
    return item ? [item] : [];
  });

  if (visibleItems.length === 0) return null;

  return (
    <nav aria-label={preview ? "Preview das redes sociais" : "Redes sociais"} className="header-social-links">
      {visibleItems.map((item) => {
        const Icon = ICONS[item.id];
        if (!Icon) return null;
        return (
          <a
            key={item.id}
            href={item.url}
            target={preview ? undefined : "_blank"}
            rel={preview ? undefined : "noopener noreferrer"}
            onClick={preview ? (event) => event.preventDefault() : undefined}
            className={`header-social-link header-social-${item.id}`}
            aria-label={item.label}
            title={item.label}
          >
            <Icon aria-hidden="true" size={16} />
            <span className="header-social-label">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
