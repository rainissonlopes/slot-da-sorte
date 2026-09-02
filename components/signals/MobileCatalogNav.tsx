import Image from "next/image";
import { Heart, LayoutGrid } from "lucide-react";

const mobileCatalogItems = [
  { value: "Todos", label: "Todos" },
  { value: "PG Games", label: "PG", logoSrc: "/providers/pg-soft-icon.webp" },
  { value: "PP Games", label: "PP", logoSrc: "/providers/pragmatic-icon.webp" },
  { value: "WG Games", label: "WG", logoSrc: "/providers/wg-icon.webp" },
  { value: "Favoritos", label: "Favoritos" },
] as const;

function ProviderLogo({ label, src }: { label: string; src: string }) {
  return (
    <span className="mobile-provider-logo" aria-hidden="true">
      <Image
        src={src}
        alt=""
        width={34}
        height={28}
        className={`mobile-provider-logo__image mobile-provider-logo__image--${label.toLowerCase()}`}
      />
    </span>
  );
}

export function MobileCatalogNav({
  categoriaAtiva,
  onCategoria,
}: {
  categoriaAtiva: string;
  onCategoria: (categoria: string) => void;
}) {
  return (
    <nav
      aria-label="Filtros rápidos do catálogo"
      className="mobile-bottom-nav"
    >
      <div className="mobile-bottom-nav__items mx-auto grid w-full max-w-lg grid-cols-5 px-1">
        {mobileCatalogItems.map((item) => {
          const active = categoriaAtiva === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-label={`Filtrar catálogo por ${item.label}`}
              aria-pressed={active}
              onClick={() => onCategoria(item.value)}
              className={`mobile-catalog-nav-item flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-extrabold leading-none whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--tenant-primary)] ${
                active
                  ? ""
                  : "text-zinc-300 hover:bg-white/5 hover:text-white active:bg-white/10"
              }`}
            >
              {item.value === "Todos" ? (
                <LayoutGrid aria-hidden="true" size={19} strokeWidth={2.4} />
              ) : item.value === "Favoritos" ? (
                <Heart aria-hidden="true" size={19} strokeWidth={2.4} fill={active ? "currentColor" : "none"} />
              ) : "logoSrc" in item ? (
                <ProviderLogo label={item.label} src={item.logoSrc} />
              ) : (
                null
              )}
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
