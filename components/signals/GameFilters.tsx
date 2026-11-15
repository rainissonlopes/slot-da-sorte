import { Globe2, Heart } from "lucide-react";

export function GameFilters({ busca, onBusca, categorias, categoriaAtiva, onCategoria }: {
  busca: string; onBusca: (value: string) => void; categorias: string[]; categoriaAtiva: string; onCategoria: (value: string) => void;
}) {
  return (
    <section aria-label="Busque e filtre os sinais" className="game-filters mx-auto w-full max-w-2xl" style={{ background: "transparent", border: 0, boxShadow: "none" }}>
      <label className="relative block">
        <span className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black text-white" aria-hidden="true"><Globe2 size={22} /></span>
        <span className="sr-only">Buscar jogo</span>
        <input value={busca} onChange={(e) => onBusca(e.target.value)} placeholder="Pesquise o seu jogo aqui" className="h-14 w-full rounded-full border border-white bg-white pl-14 pr-5 text-sm font-semibold text-black outline-none placeholder:text-black focus:border-[var(--tenant-primary)]" />
      </label>
      <div className="mt-4 hidden flex-wrap justify-center gap-2 pb-1 sm:flex">
        {categorias.map((categoria) => (
          <button key={categoria} onClick={() => onCategoria(categoria)} className={`filter-chip ${categoriaAtiva === categoria ? "filter-chip-active" : ""}`}>
            {categoria === "Favoritos" && <Heart size={14} fill={categoriaAtiva === categoria ? "currentColor" : "none"} />}{categoria}
          </button>
        ))}
      </div>
    </section>
  );
}
