import type { Jogo, SugestoesAposta } from "@/lib/signals/types";
import { GameCard } from "./GameCard";

export function GamesGrid({ jogos, favoritos, onFavorito, calcularSugestoes, emptyText = "Nenhum jogo encontrado." }: {
  jogos: Jogo[]; favoritos: string[]; onFavorito: (id: string) => void; calcularSugestoes: (bets: string[]) => SugestoesAposta; emptyText?: string;
}) {
  if (!jogos.length) return <div className="signal-surface py-12 text-center text-sm text-[var(--tenant-muted)]">{emptyText}</div>;
  return <div className="games-grid grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4 2xl:grid-cols-5">{jogos.map((jogo) => <GameCard key={jogo.id} jogo={jogo} favorito={favoritos.includes(String(jogo.id))} onFavorito={onFavorito} calcularSugestoes={calcularSugestoes} />)}</div>;
}
