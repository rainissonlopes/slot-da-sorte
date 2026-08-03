import { Heart, LayoutGrid } from "lucide-react";

const mobileCatalogItems = [
  { value: "Todos", label: "Todos" },
  { value: "PG Games", label: "PG" },
  { value: "PP Games", label: "PP" },
  { value: "WG Games", label: "WG" },
  { value: "Favoritos", label: "Favoritos" },
] as const;

function ProviderMark({ label }: { label: "PG" | "PP" | "WG" }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-5 min-w-5 place-items-center rounded-[0.3rem] border border-current px-0.5 text-[8px] font-black leading-none tracking-[-0.03em]"
    >
      {label}
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
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-extrabold leading-none whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#55d984] ${
                active
                  ? "bg-[#00A63E] text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white active:bg-white/10"
              }`}
            >
              {item.value === "Todos" ? (
                <LayoutGrid aria-hidden="true" size={19} strokeWidth={2.4} />
              ) : item.value === "Favoritos" ? (
                <Heart aria-hidden="true" size={19} strokeWidth={2.4} fill={active ? "currentColor" : "none"} />
              ) : (
                <ProviderMark label={item.label as "PG" | "PP" | "WG"} />
              )}
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
