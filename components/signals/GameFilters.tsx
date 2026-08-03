import { Heart, Search } from "lucide-react";
import { SectionHeading } from "@/components/signals/SectionHeading";

export function GameFilters({ busca, onBusca, categorias, categoriaAtiva, onCategoria }: {
  busca: string; onBusca: (value: string) => void; categorias: string[]; categoriaAtiva: string; onCategoria: (value: string) => void;
}) {
  return (
    <section aria-label="Busque e filtre os sinais" className="signal-surface p-4 sm:p-5">
      <SectionHeading icon={<Search aria-hidden="true" />} eyebrow="Encontre seu jogo" title="Busque e filtre os sinais" />
      <label className="relative block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tenant-muted)]" size={19} />
        <span className="sr-only">Buscar jogo</span>
        <input value={busca} onChange={(e) => onBusca(e.target.value)} placeholder="Busque pelo nome do jogo..." className="h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-12 pr-4 text-sm outline-none placeholder:text-[var(--tenant-muted)] focus:border-[var(--tenant-primary)]" />
      </label>
      <div className="mt-4 hidden gap-2 overflow-x-auto pb-1 md:flex">
        {categorias.map((categoria) => (
          <button key={categoria} onClick={() => onCategoria(categoria)} className={`filter-chip ${categoriaAtiva === categoria ? "filter-chip-active" : ""}`}>
            {categoria === "Favoritos" && <Heart size={14} fill={categoriaAtiva === categoria ? "currentColor" : "none"} />}{categoria}
          </button>
        ))}
      </div>
    </section>
  );
}
