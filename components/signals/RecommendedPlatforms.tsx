import type { Plataforma } from "@/lib/signals/types";

export function RecommendedPlatforms({ plataformas }: { plataformas: Plataforma[] }) {
  if (!plataformas.length) return null;
  return (
    <section aria-labelledby="platforms-title">
      <div className="section-heading"><div><span className="eyebrow">Onde jogar</span><h2 id="platforms-title">Plataformas indicadas</h2></div></div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {plataformas.map((p) => (
          <a key={p.id} href={p.link} target="_blank" rel="noopener noreferrer" title={p.nome} aria-label={`Acessar ${p.nome}`} className="platform-logo-card group relative grid aspect-square w-[76px] min-w-[76px] snap-start place-items-center sm:w-[88px] sm:min-w-[88px]">
            <img src={p.imagem} alt={p.nome} className="h-[72%] w-[72%] rounded-xl object-contain transition-transform group-hover:scale-105" onError={(event) => { event.currentTarget.src = "/placeholder.webp"; }} />
            {(p.nova || p.selo) && <span className="absolute -right-1 -top-1 rounded-full bg-[var(--tenant-primary)] px-1.5 py-0.5 text-[8px] font-black uppercase text-white">{p.selo || "Nova"}</span>}
          </a>
        ))}
      </div>
    </section>
  );
}
