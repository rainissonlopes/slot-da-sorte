import { ArrowUpRight, Heart, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { applyGameImageFallback, buildGameImageCandidates } from "@/lib/signals/resolve-game-image";
import { getSignalMetricBarClass } from "@/lib/signals/get-signal-metric-bar-class";
import { getGameThemeStyle, resolveGameThemeColor } from "@/lib/signals/game-theme";
import type { Jogo } from "@/lib/signals/types";

const barInfo = [
  ["Mínima", "min"],
  ["Padrão", "pad"],
  ["Máxima", "max"],
] as const;

export function GameCard({ jogo, favorito, onFavorito }: {
  jogo: Jogo; favorito: boolean; onFavorito: (id: string) => void;
}) {
  const faixas = getBetRanges(jogo.bets);
  const TrendIcon = jogo.tendencia === "Subindo" ? TrendingUp : jogo.tendencia === "Caindo" ? TrendingDown : Minus;
  const imageCandidates = buildGameImageCandidates({
    storageImageUrl: jogo.storageImageUrl,
    storageIconUrl: jogo.storageIconUrl,
    rawImageUrl: jogo.imagemUrl,
    manualImageOverride: jogo.imagemPersonalizada === true,
    gameId: jogo.id,
    category: jogo.cat,
  });
  const imageUrl = imageCandidates[0];
  const themeColor = resolveGameThemeColor({
    signalColor: jogo.cor,
    gameThemeColor: jogo.themeColor,
  });
  return (
    <article className="signal-card group" data-state={jogo.estado || "Neutro"} data-themed={themeColor ? "true" : undefined} style={getGameThemeStyle(themeColor)}>
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <img src={imageUrl} alt={jogo.nome} data-game-image-candidate-index="0" className="h-full w-full object-cover" onError={(event) => applyGameImageFallback(event.currentTarget, imageCandidates)} />
          <div className="game-image-detail absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-7 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
            <span className="text-[9px] font-bold text-white/85 sm:text-[10px]">Distribuição</span>
            <strong className="text-sm font-black text-white sm:text-base">{jogo.dist}%</strong>
          </div>
          <button onClick={() => onFavorito(String(jogo.id))} aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/65 backdrop-blur-sm">
            <Heart size={13} fill={favorito ? "currentColor" : "none"} className={favorito ? "text-red-400" : "text-white"} />
          </button>
        </div>
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-2.5 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5 sm:h-10 sm:w-10">
            <img src={imageUrl} alt={`Miniatura de ${jogo.nome}`} data-game-image-candidate-index="0" className="h-full w-full object-cover" onError={(event) => applyGameImageFallback(event.currentTarget, imageCandidates)} />
          </div>
          <div className="mt-2.5 min-w-0 flex-1">
            <h3 className="game-card-title font-black">{jogo.nome}</h3>
            <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-[var(--tenant-muted)] sm:text-[10px]">{jogo.cat}</p>
          </div>
        </div>
        <div className="mt-2.5 flex text-[9px] font-bold sm:text-[10px]">
          <span className="status-pill w-full" data-status={jogo.tendencia || "Estável"}><TrendIcon size={14} />{jogo.tendencia || "Estável"}</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {barInfo.map(([label, key]) => <div key={key}><div className="mb-0.5 flex justify-between gap-1 text-[9px] font-extrabold text-white/85 sm:text-[10px]"><span className="truncate">{label}</span><span className="shrink-0 tabular-nums text-white">{jogo[key]}%</span></div><div className="signal-metric-track"><div className={`signal-metric-fill ${getSignalMetricBarClass(jogo[key])}`} style={{ width: `${jogo[key]}%` }} /></div></div>)}
        </div>
        <div className="game-bet-suggestions mt-3 rounded-xl border border-white/8 bg-black/20 p-2">
          <p className="mb-2 text-center text-[9px] font-normal uppercase tracking-[.08em] text-[var(--tenant-muted)] sm:text-[10px]">Sugestões de aposta</p>
          {faixas ? (
            <div className="space-y-1 text-center text-[10px] font-normal leading-snug text-white/85 sm:text-[11px]">
              {faixas.map(({ label, value }) => <p key={label}>{label}: {value}</p>)}
            </div>
          ) : <p className="text-center text-[9px] text-white/60">Faixas indisponíveis</p>}
        </div>
        {jogo.plataforma && <p className="mt-2 truncate text-[9px] text-[var(--tenant-muted)]">Em <strong className="text-white/80">{jogo.plataforma.nome}</strong></p>}
        <a href={jogo.link} target="_blank" rel="noopener noreferrer" className="game-access-button signal-button mt-2.5 w-full px-1 py-2 text-[10px] sm:text-xs">Jogar <ArrowUpRight size={14} /></a>
      </div>
    </article>
  );
}

function getBetRanges(bets: string[]) {
  const values = [...new Set(bets.map((bet) => {
    const value = String(bet).replace(/\s|R\$/gi, "");
    return Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value);
  }).filter((bet) => Number.isFinite(bet) && bet > 0))].sort((a, b) => a - b);
  if (values.length < 3) return null;

  const format = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const firstBreak = Math.ceil(values.length / 3);
  const secondBreak = Math.ceil((values.length * 2) / 3);
  const range = (from: number, to: number) => from === to ? format(from) : `${format(from)} a ${format(to)}`;

  return [
    { label: "Mínima", value: range(values[0], values[firstBreak - 1]) },
    { label: "Padrão", value: range(values[firstBreak], values[secondBreak - 1]) },
    { label: "Máxima", value: `acima de ${format(values[secondBreak])}` },
  ];
}
