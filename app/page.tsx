"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { supabase } from "@/lib/supabase";


const CONFIG = {
  logo: "/logo.png",
};

const CACHE_KEY = "slotCards";
const CICLO_SEGUNDOS = 300;
const CICLO_MS = CICLO_SEGUNDOS * 1000;

type Jogo = {
  id: number | string;
  nome: string;
  cat: "PG Games" | "PP Games" | "WG Games";
  dist: number;
  min: number;
  pad: number;
  max: number;
  cor: string;
  link: string;
  bets: string[];
};

const calcularSugestoes = (bets: string[]) => {
  if (!bets || bets.length < 10) {
    return {
      bonus: "2,00",
      conexao: "0,50",
      extra: "1,20",
      p1: "10,00",
      p2: "20,00",
      m1: "50,00",
      m2: "100,00",
    };
  }

  return {
    bonus: bets[4],
    conexao: bets[1],
    extra: bets[3],
    p1: bets[8] || bets[0],
    p2: bets[12] || bets[1],
    m1: bets[bets.length - 3],
    m2: bets[bets.length - 1],
  };
};

const limitar = (valor: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, valor));
};

export default function Home() {
    console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [mostrarWhatsAppBar, setMostrarWhatsAppBar] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [configSite, setConfigSite] = useState<any>(null);
  const [plataformas, setPlataformas] = useState<any[]>([]);

  
useEffect(() => {

  async function carregarConfig() {

    const { data, error } = await supabase
      .from("config_site")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setConfigSite(data);
    }

    if (error) {
      console.log(error);
    }

    const { data: plataformasData, error: plataformasError } = await supabase
      .from("plataformas")
      .select("*")
      .select("*");
      console.log(plataformasData);

    if (plataformasData) {
      setPlataformas(plataformasData);
    }

    if (plataformasError) {
      console.log(plataformasError);
    }

  }

  carregarConfig();

}, []);

useEffect(() => {
  const popupFechado = localStorage.getItem("popup-plataforma");

  if (true) {
    setTimeout(() => {
      setMostrarPopup(true);
    }, 1200);
  }
}, []);
const fecharPopup = () => {
  setMostrarPopup(false);
  localStorage.setItem("popup-fechado", "true");
};

useEffect(() => {

  const favs = localStorage.getItem("favoritos");

  if (favs) {
    setFavoritos(JSON.parse(favs));
  }

}, []);

const toggleFavorito = (id: string) => {

  let novosFavoritos = [];

  if (favoritos.includes(id)) {

    novosFavoritos = favoritos.filter(f => f !== id);

  } else {

    novosFavoritos = [...favoritos, id];

  }

  setFavoritos(novosFavoritos);

  localStorage.setItem(
    "favoritos",
    JSON.stringify(novosFavoritos)
  );

};

  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [montado, setMontado] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");
  const [proximaAtualizacao, setProximaAtualizacao] = useState(CICLO_SEGUNDOS);
  const [jogos, setJogos] = useState<Jogo[]>([]);

  const carregadoRef = useRef(false);

  const categorias = ["Todos", "PG Games", "PP Games", "WG Games", "Favoritos"];

  async function carregarCards(forcarAtualizacao = false) {
    if (!forcarAtualizacao) {
      const dadosSalvos = localStorage.getItem(CACHE_KEY);

      if (dadosSalvos) {
        try {
          const parsed = JSON.parse(dadosSalvos);
          const tempoPassado = Date.now() - parsed.timestamp;

          if (parsed.jogos && tempoPassado < CICLO_MS) {
            setJogos(parsed.jogos);
            setUltimaAtualizacao(parsed.ultimaAtualizacao);
            setProximaAtualizacao(Math.max(1, Math.floor((CICLO_MS - tempoPassado) / 1000)));
            return;
          }
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    }

    const res = await fetch("/api/cards", { cache: "no-store" });
    const data = await res.json();

    const jogosFormatados: Jogo[] = (data.cards || [])
      .sort((a: any, b: any) => b.porcentagem - a.porcentagem)
      .slice(0, 250)
      .map((j: any, index: number) => {
        // Regra atual: mínima costuma ser a métrica mais forte,
        // padrão é intermediário e máxima é mais rara.
        const minima = Math.floor(Math.random() * 29) + 70; // 70 a 98
        const padrao = Math.floor(Math.random() * 41) + 45; // 45 a 85
        const maxima = Math.floor(Math.random() * 46) + 25; // 25 a 70

        // Distribuição acompanha a mínima, sem ficar sempre igual.
        const distribuicao = limitar(
          Math.floor(minima + Math.random() * 12 - 4),
          35,
          98
        );

        return {
          id: j.id,
          nome: j.nomeJogo,
          cat:
            j.categoriaJogo === "PG"
              ? "PG Games"
              : j.categoriaJogo === "PP"
              ? "PP Games"
              : "WG Games",
          dist: distribuicao,
          min: minima,
          pad: padrao,
          max: maxima,
          cor: j.colorBgGame,
          link:
  plataformas.length > 0
    ? plataformas[index % plataformas.length].link
    : "#",
          bets: j.bets || [],
        };
      });

    const horaAtualizacao = data.lastUpdateTime || new Date().toLocaleTimeString("pt-BR");

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        jogos: jogosFormatados,
        ultimaAtualizacao: horaAtualizacao,
        timestamp: Date.now(),
      })
    );

    setJogos(jogosFormatados);
    setUltimaAtualizacao(horaAtualizacao);
    setProximaAtualizacao(CICLO_SEGUNDOS);
  }

useEffect(() => {
  if (carregadoRef.current) return;

  if (plataformas.length === 0) return;

  carregadoRef.current = true;

  carregarCards(false).finally(() => {
    setMontado(true);
  });

}, [plataformas]);

  useEffect(() => {
    const timer = setInterval(() => {
      setProximaAtualizacao((tempo) => {
        if (tempo <= 1) {
          carregarCards(true);
          return CICLO_SEGUNDOS;
        }

        return tempo - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filtrados = useMemo(() => {
    const texto = busca.toLowerCase().trim();

    return jogos.filter((j) => {
      const bateBusca = j.nome.toLowerCase().includes(texto);
      const bateCategoria =
  categoriaAtiva === "Todos"
    ? true
    : categoriaAtiva === "Favoritos"
    ? favoritos.includes(String(j.id))
    : j.cat === categoriaAtiva;

      return bateBusca && bateCategoria;
    });
  }, [busca, categoriaAtiva, jogos]);

  if (!montado) return null;

  return (
    <main className="min-h-screen bg-[#020806] text-white font-sans overflow-x-hidden">
      {/* --- SEÇÃO 01: HEADER E LANDING --- */}
      <section className="relative pt-8 pb-10 px-6 bg-[radial-gradient(circle_at_center,#1b4332,transparent_60%)]">
        <header className="max-w-7xl mx-auto flex items-center justify-between mb-16" />

        <div className="max-w-7xl mx-auto text-center flex flex-col items-center space-y-8">
          <img
            src="/logo.webp"
            alt="Slot da Sorte"
            className="w-[200px] md:w-[360px] drop-shadow-[0_0_35px_rgba(34,197,94,0.35)]"
          />

          <h2 className="text-5xl md:text-7xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase max-w-4xl">
            SINAIS DE SLOT EM <span className="text-[#00ff66]">TEMPO REAL</span>
          </h2>
        </div>

        {/* PLATAFORMAS INDICADAS */}
        <div className="mt-12 mb-4 text-center">
          <h3 className="text-3xl font-black uppercase tracking-wide text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
            PLATAFORMAS INDICADAS
          </h3>
        </div>

        <div className="bg-gradient-to-r from-green-900/90 via-green-700/70 to-green-900/90 border border-green-500/30 rounded-[40px] p-5 md:p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(34,197,94,0.35)] max-w-7xl mx-auto overflow-visible">
          <div className="grid grid-cols-3 md:flex md:justify-center gap-4 md:gap-6">
            {plataformas.map((p, i) => (
              <a
                key={i}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-[88px] h-[88px] md:w-20 md:h-20 rounded-[24px] bg-zinc-950 border border-white/5 overflow-visible shadow-2xl transition-all duration-300 hover:scale-105 hover:border-[#00ff66] active:scale-95 animate-platform-float"
              >
                <div className="absolute -top-3 -right-2 bg-[#22c55e] text-white text-[9px] px-3 py-[2px] rounded-full font-black uppercase border border-white/20 shadow-[0_0_14px_rgba(34,197,94,0.65)] z-20">
                  NOVO
                </div>

                <img
                  src={p.imagem}
                  className="w-full h-full object-cover rounded-[24px] opacity-90 hover:opacity-100 transition-all duration-300"
                  alt={p.nome}
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* --- SEÇÃO 02: SINAIS AO VIVO --- */}
      <section className="bg-[#020806] pt-10 pb-24 px-4">
        <div className="max-w-[1500px] mx-auto space-y-12">
          {/* CONTADOR */}
          <div className="relative w-full max-w-[400px] h-[120px] mx-auto rounded-[28px] border border-[#00ff66]/30 bg-[linear-gradient(135deg,#0f7a2d_0%,#006b26_45%,#001b0d_100%)] shadow-[0_0_35px_rgba(34,197,94,0.22)] overflow-hidden flex items-center justify-center">
            <img
              src="/botao-atualizar.webp"
              alt="Atualizar"
              className="w-[82px] shrink-0 drop-shadow-[0_0_18px_rgba(132,204,22,0.45)]"
            />

            <div className="flex flex-col leading-tight text-left ml-4">
              <p className="text-white font-black text-[15px] whitespace-nowrap">
                Última atualização:
                <span className="ml-1 text-green-300">{ultimaAtualizacao}</span>
              </p>

              <p className="text-yellow-400 font-black text-[16px] whitespace-nowrap">
                Próxima atualização:
                <span className="ml-1">
                  {Math.floor(proximaAtualizacao / 60)}m {proximaAtualizacao % 60}s
                </span>
              </p>
            </div>
          </div>

          {/* BUSCA E FILTROS */}
          <div className="max-w-3xl mx-auto mt-10 space-y-6">
            <input
              type="text"
              placeholder="Qual jogo você quer lucrar?"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-[#041109] border border-[#00ff66]/25 rounded-[24px] py-5 px-8 text-center font-black text-[15px] text-white outline-none placeholder:text-zinc-500 shadow-[0_0_25px_rgba(0,255,102,0.10)] focus:border-[#00ff66] focus:shadow-[0_0_35px_rgba(0,255,102,0.28)] transition-all duration-300"
            />

            <div className="flex justify-center">
              <div className="bg-[#002811]/80 p-2 rounded-[22px] flex gap-2 border border-[#00ff66]/20 backdrop-blur-xl overflow-x-auto no-scrollbar shadow-[0_0_20px_rgba(0,255,102,0.08)]">
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoriaAtiva(c)}
                    className={`whitespace-nowrap px-7 py-3 rounded-full text-[12px] font-black uppercase transition-all duration-300 ${
                      categoriaAtiva === c
                        ? "bg-[#FFC801] text-black shadow-[0_0_18px_rgba(255,200,1,0.45)]"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GRID DE CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
            {filtrados.map((j, index) => {
              return (
                <a
                  key={j.id}
                  href={j.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: j.cor }}
                  className="border border-white/10 rounded-[24px] p-2 flex flex-col shadow-2xl transition-all hover:scale-[1.03]"
                >
                  {/* BANNER */}
                  <div className="relative aspect-[4/3.1] rounded-[26px] overflow-hidden mb-4 shadow-lg">
                    <img
                      src={`https://reidoslotsinais.bet/images/games/${j.id}.webp`}
                      className="w-full h-full object-cover"
                      alt={j.nome}
                      loading={index < 8 ? "eager" : "lazy"}
                      decoding="async"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.dataset.fallback = "local";
                          e.currentTarget.src = `/jogos/${j.id}.webp`;
                        } else {
                          e.currentTarget.src = "/placeholder.webp";
                        }
                      }}
                    />

                    <button
  onClick={(e) => {
    e.preventDefault();
    toggleFavorito(String(j.id));
  }}
  className="absolute top-2 right-2 z-20"
>

  {favoritos.includes(String(j.id)) ? (

    <span className="text-red-500 text-xl drop-shadow-lg">
      ❤️
    </span>

  ) : (

    <span className="text-white text-xl drop-shadow-lg">
      🤍
    </span>

  )}

</button>

                    <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm py-2 text-center">
                      <p className="text-[10px] font-black text-white">DISTRIBUIÇÃO: {j.dist}%</p>
                    </div>
                  </div>

                  <div className="px-1 space-y-3 grow flex flex-col">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[12px] font-black text-white uppercase leading-none">{j.nome}</h4>
                    </div>

                    {/* BARRAS */}
                    <div className="space-y-2">
                      {[
                        { l: "Mínima", v: j.min },
                        { l: "Padrão", v: j.pad },
                        { l: "Máxima", v: j.max },
                      ].map((b) => {
                        let corBarra = "bg-red-600";
                        let sombraBarra = "shadow-[0_0_10px_#dc2626]";

                        if (b.v >= 70) {
                          corBarra = "bg-[#00ff66]";
                          sombraBarra = "shadow-[0_0_10px_#22c55e]";
                        } else if (b.v >= 50) {
                          corBarra = "bg-yellow-400";
                          sombraBarra = "shadow-[0_0_10px_#facc15]";
                        }

                        return (
                          <div key={b.l}>
                            <div className="flex justify-between text-[10px] font-black text-white uppercase mb-1">
                              <span>{b.l}</span>
                              <span>{b.v}%</span>
                            </div>

                            <div className="w-full h-3 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${b.v}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full ${corBarra} ${sombraBarra} transition-all duration-500`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* BOX DE APOSTAS */}
                    <div className="bg-black/20 rounded-[24px] p-3 border border-white/5 space-y-3 mt-auto">
                      <p className="text-[#FFC801] text-[10px] font-bold uppercase text-center">
                        Apostas
                      </p>

                      {(() => {
                        const s = calcularSugestoes(j.bets);

                        return (
                          <div className="space-y-">
                            <div className="space-y-1 text-[10px] font-black text-white uppercase tracking-tighter">
                              <p className="text-center text-[10px] mb-1 tracking-widest">MÍNIMA</p>
                              <div className="flex justify-between items-center">
                                <span>Bônus:</span>
                                <span className="bg-[#22c55e] text-white px-2 py-0.5 rounded-md">{s.bonus}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Conexão:</span>
                                <span className="bg-[#22c55e] text-white px-2 py-0.5 rounded-md">{s.conexao}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Bet Extra:</span>
                                <span className="bg-[#22c55e] text-white px-2 py-0.5 rounded-md">{s.extra}</span>
                              </div>
                            </div>

                            <div className="space-y-1 pt-1 border-t border-white/5">
                              <p className="text-center text-[10px] font-black uppercase tracking-widest">PADRÃO</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#22c55e] text-white text-center py-1.5 rounded-lg text-[11px] font-black">{s.p1}</div>
                                <div className="bg-[#22c55e] text-white text-center py-1.5 rounded-lg text-[11px] font-black">{s.p2}</div>
                              </div>
                            </div>

                            <div className="space-y-1 pt-1 border-t border-white/5">
                              <p className="text-center text-[10px] font-black uppercase tracking-widest">MÁXIMA</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#22c55e] text-white text-center py-1.5 rounded-lg text-[11px] font-black">{s.m1}</div>
                                <div className="bg-[#22c55e] text-white text-center py-1.5 rounded-lg text-[11px] font-black">{s.m2}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="w-full bg-[#00cc55] text-white font-black py-3 rounded-[22px] text-xs uppercase mt-1 shadow-xl hover:bg-white hover:text-black transition-all flex items-center justify-center">
                      Jogar ▶
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-black border-t border-white/5 pt-20 pb-10 px-6">
        <div className="max-w-[1500px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <img src={CONFIG.logo} alt="Logo" className="w-8 h-8 opacity-50" />
                <h1 className="font-black tracking-tighter text-xl">
                  SLOT <span className="text-green-500">DA SORTE</span>
                </h1>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed uppercase font-bold text-[10px]">
                A plataforma de sinais mais assertiva do mercado.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-white font-black uppercase text-xs tracking-widest">Links</h4>
              <ul className="space-y-2 text-zinc-600 text-[10px] font-black uppercase">
                <li className="hover:text-green-500 cursor-pointer">Sinais ao Vivo</li>
                <li className="hover:text-green-500 cursor-pointer">Grupo VIP</li>
              </ul>
            </div>

            <div className="space-y-6 md:col-span-2">
              <h4 className="text-[#FFC801] font-black uppercase text-xs tracking-widest italic">Jogo Responsável</h4>
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 border border-zinc-900 rounded-lg flex items-center justify-center text-zinc-600 font-black text-xs">
                  18+
                </div>
              </div>
              <p className="text-[9px] text-zinc-700 leading-tight uppercase font-black max-w-sm">
                As apostas podem causar dependência. Jogue com moderação. Os sinais são baseados em probabilidades estatísticas.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex justify-between items-center">
            <p className="text-zinc-800 text-[9px] font-black uppercase tracking-widest">
              © 2026 SLOT DA SORTE - TODOS OS DIREITOS RESERVADOS
            </p>
          </div>
        </div>
      </footer>
{mostrarPopup && (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35 }}
    className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center px-4"
  >
    <div className="w-full max-w-[320px]">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="relative w-full overflow-hidden rounded-[28px]"
        style={{ aspectRatio: "9/16" }}
      >
        <img
          src="/popup-427win.webp"
          className="w-full h-full object-cover"
        />
      </motion.div>

      <label className="flex items-center gap-2 mt-3 mb-3 text-white text-sm px-2">
        <input
          type="checkbox"
          onChange={(e) => {
            if (e.target.checked) {
              localStorage.setItem("popup-plataforma", "true");
            } else {
              localStorage.removeItem("popup-plataforma");
            }
          }}
          className="w-4 h-4"
        />
        Não mostrar mais esta mensagem
      </label>

      <div className="flex gap-3">
        <a
          href={configSite?.popupLink || "#"}
          target="_blank"
          className="flex-1 h-11 bg-[#0d8bff] hover:bg-[#2498ff] transition-all text-white font-bold text-center text-sm rounded-[12px] flex items-center justify-center"
        >
          Acessar Plataforma
        </a>

        <button
          type="button"
          onClick={() => {

          setMostrarPopup(false);

          setTimeout(() => {

            const fechado = localStorage.getItem("fechar-whatsapp-bar");

            if (!fechado) {
              setMostrarWhatsAppBar(true);
            }

          }, 500);

        }}
          className="flex-1 h-11 bg-[#ff9800] hover:bg-[#ffad33] transition-all text-white font-bold text-sm rounded-[12px]"
        >
          Fechar
        </button>
      </div>
    </div>
  </motion.div>
)}

{mostrarWhatsAppBar && (

  <div
    id="cta-whatsapp"
    className="fixed bottom-3 right-3 z-[9999] w-[92%] max-w-[280px]"
  >

    <div className="bg-[#9BE15D] text-black rounded-2xl shadow-2xl overflow-hidden border border-black/10">

      <div className="flex items-center justify-between px-3 py-2 gap-3">

        <a
          href={configSite?.whatsapp || "#"}
          target="_blank"
          className="flex items-center gap-3 flex-1"
        >

          <FaWhatsapp className="text-[20px]" />

          <div className="leading-tight">

            <div className="font-black text-sm">
              Grupo VIP no WhatsApp!
            </div>

            <div className="text-[11px] opacity-80">
              Entre agora e receba sinais ao vivo
            </div>

          </div>

        </a>

        <button
          onClick={() => {

            localStorage.setItem("fechar-whatsapp-bar", "true");

            setMostrarWhatsAppBar(false);

          }}
          className="text-black text-lg font-bold"
        >
          ×
        </button>

      </div>

    </div>

  </div>

)}
    </main>
  );
}
