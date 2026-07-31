"use client";

import { Gamepad2 } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "@/components/signals/SectionHeading";
import type { Plataforma } from "@/lib/signals/types";

const MOBILE_PLATFORM_LIMIT = 12;

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
      className="group relative block aspect-square w-full min-w-0"
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
      {isNew && (
        <span className="platform-new-badge absolute -right-1 -top-2 z-10 rounded-full bg-amber-400 px-2.5 py-1 text-[9px] font-black leading-none text-black shadow-md sm:px-3 sm:text-[10px]">
          NOVA
        </span>
      )}
    </a>
  );
}

export function RecommendedPlatforms({ plataformas }: { plataformas: Plataforma[] }) {
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  if (!plataformas.length) return null;

  const hasMorePlatforms = plataformas.length > MOBILE_PLATFORM_LIMIT;

  return (
    <section aria-label="Plataformas indicadas">
      <SectionHeading
        icon={<Gamepad2 aria-hidden="true" />}
        eyebrow="Onde jogar"
        title="Plataformas indicadas"
        align="center"
      />
      <div
        id="recommended-platforms-grid"
        className="mx-auto flex w-full max-w-[1080px] flex-wrap justify-center gap-x-3 gap-y-5 pt-2 px-1"
      >
        {plataformas.map((platform, index) => (
          <div
            key={platform.id}
            className={`platform-card-cell${!showAllPlatforms && index >= MOBILE_PLATFORM_LIMIT ? " hidden min-[900px]:block" : ""}`}
          >
            <PlatformCard platform={platform} isNew />
          </div>
        ))}
      </div>
      {hasMorePlatforms && (
        <div className="mt-5 flex justify-center min-[900px]:hidden">
          <button
            type="button"
            aria-controls="recommended-platforms-grid"
            aria-expanded={showAllPlatforms}
            onClick={() => setShowAllPlatforms((current) => !current)}
            className="signal-button px-5 py-2.5"
          >
            {showAllPlatforms ? "Ver menos plataformas" : "Ver todas as plataformas"}
          </button>
        </div>
      )}
    </section>
  );
}
