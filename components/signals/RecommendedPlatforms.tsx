import { Gamepad2 } from "lucide-react";
import { SectionHeading } from "@/components/signals/SectionHeading";
import type { Plataforma } from "@/lib/signals/types";

type PlatformCardProps = {
  platform: Plataforma;
  isNew?: boolean;
};

function PlatformCard({ platform, isNew = false }: PlatformCardProps) {
  return (
    <a
      href={platform.link}
      target="_blank"
      rel="noopener noreferrer"
      title={platform.nome}
      aria-label={`Acessar ${platform.nome}`}
      className="group relative aspect-square w-[84px] min-w-[84px] snap-start sm:w-[100px] sm:min-w-[100px] lg:w-[116px] lg:min-w-[116px]"
    >
      <span className="absolute inset-0 overflow-hidden rounded-2xl bg-[var(--tenant-surface)]">
        <img
          src={platform.imagem}
          alt={platform.nome}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = "/placeholder.webp";
          }}
        />
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/45 to-transparent" aria-hidden="true" />
        <span className="absolute inset-x-1 bottom-2 line-clamp-2 text-center text-[9px] font-black leading-tight text-white drop-shadow-md sm:inset-x-2 sm:text-[10px]">
          {platform.nome}
        </span>
      </span>
      {isNew && (
        <span className="absolute -right-1 -top-2 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[9px] font-black leading-none text-black shadow-md sm:px-3 sm:text-[10px]">
          NOVA
        </span>
      )}
    </a>
  );
}

export function RecommendedPlatforms({ plataformas }: { plataformas: Plataforma[] }) {
  if (!plataformas.length) return null;

  return (
    <section aria-label="Plataformas indicadas">
      <SectionHeading icon={<Gamepad2 aria-hidden="true" />} eyebrow="Onde jogar" title="Plataformas indicadas" />
      <div className="platforms-track -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 pt-2 scroll-smooth sm:mx-0 sm:gap-4 sm:px-0">
        {plataformas.map((platform) => (
          <PlatformCard key={platform.id} platform={platform} isNew />
        ))}
      </div>
    </section>
  );
}
