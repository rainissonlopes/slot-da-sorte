"use client";

import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { useRef } from "react";
import { SectionHeading } from "@/components/signals/SectionHeading";
import { applyGameImageFallback, buildGameImageCandidates } from "@/lib/signals/resolve-game-image";
import type { Jogo } from "@/lib/signals/types";

export function TrendingGames({ jogos }: { jogos: Jogo[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 520, behavior: "smooth" });
  };

  return (
    <section aria-label="Maiores distribuições hoje">
      <SectionHeading
        icon={<Flame aria-hidden="true" />}
        eyebrow="Destaques do momento"
        title="Maiores distribuições hoje"
        action={
          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" onClick={() => scroll(-1)} className="carousel-arrow" aria-label="Ver jogos anteriores"><ChevronLeft size={19} /></button>
            <button type="button" onClick={() => scroll(1)} className="carousel-arrow" aria-label="Ver próximos jogos"><ChevronRight size={19} /></button>
          </div>
        }
      />
      <div ref={trackRef} className="trending-track -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {jogos.slice(0, 8).map((jogo) => {
          const imageCandidates = buildGameImageCandidates({
            storageImageUrl: jogo.storageImageUrl,
            storageIconUrl: jogo.storageIconUrl,
            rawImageUrl: jogo.imagemUrl,
            gameId: jogo.id,
            category: jogo.cat,
          });
          return (
            <a
              key={jogo.id}
              href={jogo.link}
              target="_blank"
              rel="noopener noreferrer"
              className="trending-card group relative aspect-[4/5] w-[30vw] min-w-[108px] max-w-[132px] snap-start overflow-hidden rounded-2xl border border-white/10 bg-[var(--tenant-surface)] sm:w-[180px] sm:min-w-[180px] sm:max-w-none"
            >
              <img
                src={imageCandidates[0]}
                alt={jogo.nome}
                data-game-image-candidate-index="0"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(event) => applyGameImageFallback(event.currentTarget, imageCandidates)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/15" />
              <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-black text-white shadow-lg">{jogo.dist}%</span>
              <h3 className="absolute inset-x-2 bottom-2 line-clamp-2 text-[11px] font-black leading-tight text-white sm:text-sm">{jogo.nome}</h3>
            </a>
          );
        })}
      </div>
    </section>
  );
}
