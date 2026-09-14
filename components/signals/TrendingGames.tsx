"use client";

import { SectionHeading } from "@/components/signals/SectionHeading";
import { applyGameImageFallback, buildGameImageCandidates } from "@/lib/signals/resolve-game-image";
import { getGameThemeStyle, resolveGameThemeColor } from "@/lib/signals/game-theme";
import type { Jogo } from "@/lib/signals/types";

export function TrendingGames({ jogos }: { jogos: Jogo[] }) {
  const featuredGames = jogos.slice(0, 8);

  const renderGames = (duplicate = false) => featuredGames.map((jogo) => {
    const themeColor = resolveGameThemeColor({
      signalColor: jogo.cor,
      gameThemeColor: jogo.themeColor,
    });
    const imageCandidates = buildGameImageCandidates({
      storageImageUrl: jogo.storageImageUrl,
      storageIconUrl: jogo.storageIconUrl,
      rawImageUrl: jogo.imagemUrl,
      manualImageOverride: jogo.imagemPersonalizada === true,
      gameId: jogo.id,
      category: jogo.cat,
    });

    return (
      <a
        key={`${duplicate ? "duplicate" : "original"}-${jogo.id}`}
        href={jogo.link}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={duplicate ? -1 : undefined}
        className="trending-card game-themed-card group relative aspect-[4/5] w-[30vw] min-w-[108px] max-w-[132px] overflow-hidden rounded-2xl border border-white/10 bg-[var(--tenant-surface)] sm:w-[180px] sm:min-w-[180px] sm:max-w-none"
        data-themed={themeColor ? "true" : undefined}
        style={getGameThemeStyle(themeColor)}
      >
        <img
          src={imageCandidates[0]}
          alt={jogo.nome}
          data-game-image-candidate-index="0"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => applyGameImageFallback(event.currentTarget, imageCandidates)}
        />
        <div className="game-image-detail absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/15" />
        <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-black text-white shadow-lg">{jogo.dist}%</span>
        <h3 className="absolute inset-x-2 bottom-2 line-clamp-2 text-[11px] font-black leading-tight text-white sm:text-sm">{jogo.nome}</h3>
      </a>
    );
  });

  return (
    <section aria-label="Maiores distribuições hoje">
      <SectionHeading
        title="MAIORES DISTRIBUIÇÕES HOJE"
        accentTitle
      />
      <div className="trending-marquee -mx-4 overflow-hidden px-4 pb-3 sm:mx-0 sm:px-0">
        <div className="trending-marquee-track">
          <div className="trending-marquee-group">{renderGames()}</div>
          <div className="trending-marquee-group" aria-hidden="true">{renderGames(true)}</div>
        </div>
      </div>
    </section>
  );
}
