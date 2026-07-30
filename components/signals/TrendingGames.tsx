import type { Jogo, SugestoesAposta } from "@/lib/signals/types";
import { GameCard } from "./GameCard";

export function TrendingGames(props: { jogos: Jogo[]; favoritos: string[]; onFavorito: (id: string) => void; calcularSugestoes: (bets: string[]) => SugestoesAposta }) {
  return <section aria-labelledby="trending-title"><div className="section-heading"><div><span className="eyebrow">Mais oportunidades</span><h2 id="trending-title">Jogos em alta</h2></div><p>Seleção atualizada pelos sinais do momento.</p></div><div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">{props.jogos.map((jogo) => <div key={jogo.id} className="w-[164px] min-w-[164px] snap-start sm:w-[210px] sm:min-w-[210px] lg:w-[230px] lg:min-w-[230px]"><GameCard jogo={jogo} favorito={props.favoritos.includes(String(jogo.id))} onFavorito={props.onFavorito} calcularSugestoes={props.calcularSugestoes} /></div>)}</div></section>;
}
