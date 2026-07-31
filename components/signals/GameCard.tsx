import { ArrowUpRight, Flame, Heart, Minus, Snowflake, TrendingDown, TrendingUp } from "lucide-react";
import { applyGameImageFallback, buildGameImageCandidates } from "@/lib/signals/resolve-game-image";
import { getSignalMetricBarClass } from "@/lib/signals/get-signal-metric-bar-class";
import type { Jogo, SugestoesAposta } from "@/lib/signals/types";

const barInfo = [
  ["Mínima", "min"],
  ["Padrão", "pad"],
  ["Máxima", "max"],
] as const;

export function GameCard({ jogo, favorito, onFavorito, calcularSugestoes }: {
  jogo: Jogo; favorito: boolean; onFavorito: (id: string) => void; calcularSugestoes: (bets: string[]) => SugestoesAposta;
}) {
  const sugestoes = calcularSugestoes(jogo.bets);
  const StateIcon = jogo.estado === "Quente" ? Flame : jogo.estado === "Frio" ? Snowflake : Minus;
  const TrendIcon = jogo.tendencia === "Subindo" ? TrendingUp : jogo.tendencia === "Caindo" ? TrendingDown : Minus;
  const imageCandidates = buildGameImageCandidates({
    storageImageUrl: jogo.storageImageUrl,
    storageIconUrl: jogo.storageIconUrl,
    rawImageUrl: jogo.imagemUrl,
    gameId: jogo.id,
    category: jogo.cat,
  });
  const imageUrl = imageCandidates[0];
  return (
    <article className="signal-card group" data-state={jogo.estado || "Neutro"}>
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <img src={imageUrl} alt={jogo.nome} data-game-image-candidate-index="0" className="h-full w-full object-cover" onError={(event) => applyGameImageFallback(event.currentTarget, imageCandidates)} />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-7 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
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
        <div className="mt-2.5 grid grid-cols-2 gap-1 text-[9px] font-bold sm:text-[10px]">
          <span className="status-pill"><StateIcon size={14} />{jogo.estado || "Neutro"}</span>
          <span className="status-pill"><TrendIcon size={14} />{jogo.tendencia || "Estável"}</span>
        </div>
        <div className="mt-3 space-y-2">
          {barInfo.map(([label, key]) => <div key={key}><div className="mb-1 flex justify-between gap-1 text-[9px] font-bold text-white/70 sm:text-[10px]"><span className="truncate">{label}</span><span>{jogo[key]}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full ${getSignalMetricBarClass(jogo[key])}`} style={{ width: `${jogo[key]}%` }} /></div></div>)}
        </div>
        <div className="mt-3 rounded-xl border border-white/8 bg-black/20 p-2">
          <p className="mb-1.5 truncate text-[8px] font-black uppercase tracking-[.12em] text-[var(--tenant-muted)] sm:text-[9px]">Sugestões de aposta</p>
          <div className="grid grid-cols-3 gap-1 text-center text-[8px] sm:text-[9px]"><Bet label="Bônus" value={sugestoes.bonus} /><Bet label="Conexão" value={sugestoes.conexao} /><Bet label="Extra" value={sugestoes.extra} /></div>
          <div className="mt-1 grid grid-cols-2 gap-1 text-center text-[8px] sm:text-[9px]"><Bet label="Padrão" value={`${sugestoes.p1} / ${sugestoes.p2}`} /><Bet label="Máxima" value={`${sugestoes.m1} / ${sugestoes.m2}`} /></div>
        </div>
        {jogo.plataforma && <p className="mt-2 truncate text-[9px] text-[var(--tenant-muted)]">Em <strong className="text-white/80">{jogo.plataforma.nome}</strong></p>}
        <a href={jogo.link} target="_blank" rel="noopener noreferrer" className="signal-button mt-2.5 w-full px-1 py-2 text-[10px] sm:text-xs">Acessar <ArrowUpRight size={14} /></a>
      </div>
    </article>
  );
}

function Bet({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md bg-white/5 px-0.5 py-1.5"><span className="block truncate text-white/50">{label}</span><strong className="mt-0.5 block truncate text-white">{value}</strong></div>;
}
