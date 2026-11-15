"use client";

import { SectionHeading } from "@/components/signals/SectionHeading";
import type { Plataforma } from "@/lib/signals/types";

type PlatformCardProps = {
  platform: Plataforma;
};

function PlatformCard({ platform }: PlatformCardProps) {
  return (
    <a
      href={platform.link}
      target="_blank"
      rel="noopener noreferrer"
      title={platform.nome}
      aria-label={`Acessar ${platform.nome}`}
      className="platform-attention group relative block aspect-square w-full min-w-0"
    >
      <span className="absolute inset-0 overflow-hidden rounded-2xl bg-[var(--tenant-surface)]">
        <img
          src={platform.imagem}
          alt={platform.nome}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(event) => {
            event.currentTarget.src = "/placeholder.webp";
          }}
        />
      </span>
      <img src="/tag-nova.png" alt="Nova" className="absolute -right-1 -top-2 z-10 h-auto w-[38px]" />
    </a>
  );
}

export function RecommendedPlatforms({ plataformas }: { plataformas: Plataforma[] }) {
  if (!plataformas.length) return null;

  return (
    <section aria-label="Plataformas indicadas" className="recommended-platforms-panel" style={{ position: "relative", overflow: "visible", background: "#004719", border: "4px solid #00d64f", paddingTop: "2.75rem" }}>
      <img src="/logo-painel-neon.png" alt="Slot da Sorte" className="recommended-platforms-logo" style={{ position: "absolute", top: 0, left: "50%", width: "200px", maxWidth: "38%", height: "auto", transform: "translate(-50%, -50%)", zIndex: 2 }} />
      <SectionHeading
        title="PLATAFORMAS INDICADAS"
        accentTitle
        align="center"
      />
      <div id="recommended-platforms-grid" className="platforms-track px-1 pb-3 pt-2">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 min-[1024px]:flex-col min-[1024px]:items-center min-[1024px]:gap-3">
          {[plataformas.slice(0, Math.ceil(plataformas.length * 3 / 4)), plataformas.slice(Math.ceil(plataformas.length * 3 / 4))].map((row, rowIndex) => (
            <div key={rowIndex} className="contents min-[1024px]:flex min-[1024px]:justify-center min-[1024px]:gap-3">
              {row.map((platform) => (
                <div key={platform.id} className="w-[68px] shrink-0 sm:w-[80px]">
                  <PlatformCard platform={platform} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="recommended-platforms-domain" aria-label="Site Slot da Sorte">
        <span>slotdasorte.com.br</span>
      </div>

    </section>
  );
}
