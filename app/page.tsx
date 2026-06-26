"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaWhatsapp, FaHome, FaInstagram, FaTelegram } from "react-icons/fa";
import { ShieldCheck, RefreshCw, Smartphone, Activity, Play } from "lucide-react";
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
  imagemUrl?: string;
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

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "0, 255, 102";
}

export default function Home() {
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [mostrarWhatsAppBar, setMostrarWhatsAppBar] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [configSite, setConfigSite] = useState<any>(null);
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [aparencia, setAparencia] = useState<any>(null);

  // Load database configs and white-label branding configurations
  useEffect(() => {
    async function carregarConfig() {
      // Load general configs
      const { data, error } = await supabase
        .from("config_site")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data) {
        setConfigSite(data);
      }
      console.log("CONFIG COMPLETA:", data);

      if (error) {
        console.log(error);
      }

      // Load white-label appearance branding
      let domain = "default";
      if (typeof window !== "undefined") {
        domain = window.location.hostname;
        if (domain.includes("localhost") || domain.includes("127.0.0.1")) {
          domain = "default";
        }
      }

      let { data: aparenciaData, error: aparenciaError } = await supabase
        .from("aparencia")
        .select("*")
        .eq("domain", domain)
        .maybeSingle();

      if (!aparenciaData || aparenciaError) {
        const { data: defaultAparencia } = await supabase
          .from("aparencia")
          .select("*")
          .eq("domain", "default")
          .maybeSingle();
        aparenciaData = defaultAparencia;
      }

      if (aparenciaData) {
        setAparencia(aparenciaData);
      }

      // Load platforms
      const { data: plataformasData, error: plataformasError } = await supabase
        .from("plataformas")
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

  // Update favicon and Document Title dynamically
  useEffect(() => {
    if (aparencia?.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = aparencia.favicon_url;
    }
    if (aparencia?.nome_site) {
      document.title = aparencia.nome_site;
    }
  }, [aparencia]);

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
    localStorage.setItem("favoritos", JSON.stringify(novosFavoritos));
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
    try {
      const dadosSalvos = localStorage.getItem(CACHE_KEY);
      let cacheJogos: Jogo[] = [];
      let cacheValido = false;
      let cacheTimestamp = Date.now();
      let tempoRestante = CICLO_SEGUNDOS;

      if (dadosSalvos && !forcarAtualizacao) {
        try {
          const parsed = JSON.parse(dadosSalvos);
          const tempoPassado = Date.now() - parsed.timestamp;
          if (parsed.jogos && tempoPassado < CICLO_MS) {
            cacheJogos = parsed.jogos;
            cacheValido = true;
            cacheTimestamp = parsed.timestamp;
            tempoRestante = Math.max(1, Math.floor((CICLO_MS - tempoPassado) / 1000));
          }
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }
      }

      const { data: sinaisData, error: sinaisError } = await supabase
        .from("sinais")
        .select("*");

      if (sinaisError) {
        throw sinaisError;
      }

      const jogosFormatados: Jogo[] = (sinaisData || [])
        .map((j: any, index: number) => {
          const cachedGame = cacheValido
            ? cacheJogos.find((cg) => String(cg.id) === String(j.id))
            : null;

          const minima = cachedGame ? cachedGame.min : Math.floor(Math.random() * 29) + 70;
          const padrao = cachedGame ? cachedGame.pad : Math.floor(Math.random() * 41) + 45;
          const maxima = cachedGame ? cachedGame.max : Math.floor(Math.random() * 46) + 25;
          const distribuicao = cachedGame
            ? cachedGame.dist
            : limitar(Math.floor(minima + Math.random() * 12 - 4), 35, 98);

          return {
            id: j.id,
            nome: j.nome_jogo,
            cat: (j.categoria_jogo === "PG"
              ? "PG Games"
              : j.categoria_jogo === "PP"
                ? "PP Games"
                : "WG Games") as "PG Games" | "PP Games" | "WG Games",
            dist: distribuicao,
            min: minima,
            pad: padrao,
            max: maxima,
            cor: j.cor_background || "#1c1c1e",
            link: plataformas.length > 0 ? plataformas[index % plataformas.length].link : "#",
            bets: j.bets || [],
            imagemUrl: j.imagem_url,
          };
        })
        .sort((a, b) => b.dist - a.dist)
        .slice(0, 250);

      const horaAtualizacao = cacheValido && dadosSalvos
        ? JSON.parse(dadosSalvos).ultimaAtualizacao
        : new Date().toLocaleTimeString("pt-BR");

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          jogos: jogosFormatados,
          ultimaAtualizacao: horaAtualizacao,
          timestamp: cacheValido ? cacheTimestamp : Date.now(),
        })
      );

      setJogos(jogosFormatados);
      setUltimaAtualizacao(horaAtualizacao);
      setProximaAtualizacao(cacheValido ? tempoRestante : CICLO_SEGUNDOS);
    } catch (err) {
      console.log("ERRO CARDS:", err);
    } finally {
      setMontado(true);
    }
  }

  useEffect(() => {
    if (carregadoRef.current) return;
    if (plataformas.length === 0) return;
    carregadoRef.current = true;
    carregarCards(false);
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
  }, [busca, categoriaAtiva, jogos, favoritos]);

  if (!montado) {
    return <div className="w-full h-screen bg-black" />;
  }

  const primaryHex = aparencia?.cor_primaria || "#16A34A";
  const secondaryHex = aparencia?.cor_secundaria || "#22C55E";

  return (
    <main className="relative min-h-screen text-white font-sans overflow-x-hidden">
      {/* Background Fixo Global */}
      <div className="fixed-bg" />

      {/* Estilos dinâmicos do branding customizável */}
      <style>{`
        :root {
          --primary-color: ${primaryHex};
          --secondary-color: ${secondaryHex};
          --primary-glow: rgba(${hexToRgb(primaryHex)}, 0.35);
        }
        
        .text-primary-dynamic {
          color: var(--primary-color) !important;
        }
        .bg-primary-dynamic {
          background-color: var(--primary-color) !important;
        }
        .border-primary-dynamic {
          border-color: var(--primary-color) !important;
        }
        
        .text-secondary-dynamic {
          color: var(--secondary-color) !important;
        }
        .bg-secondary-dynamic {
          background-color: var(--secondary-color) !important;
        }
        .border-secondary-dynamic {
          border-color: var(--secondary-color) !important;
        }
        
        .glow-primary-dynamic {
          filter: drop-shadow(0 0 35px var(--primary-glow));
        }
        .glow-secondary-dynamic {
          filter: drop-shadow(0 0 15px var(--secondary-color));
        }
        
        .border-primary-alpha {
          border-color: rgba(${hexToRgb(primaryHex)}, 0.3) !important;
        }
        
        .bg-counter-gradient {
          background-image: linear-gradient(135deg, rgba(${hexToRgb(primaryHex)}, 0.48) 0%, rgba(${hexToRgb(primaryHex)}, 0.22) 45%, #000000 100%) !important;
        }
        
        .input-search-dynamic {
          background-color: #041109 !important;
          border-color: rgba(${hexToRgb(primaryHex)}, 0.25) !important;
        }
        .input-search-dynamic:focus {
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 35px rgba(${hexToRgb(primaryHex)}, 0.28) !important;
        }
        
        .category-container-dynamic {
          border-color: rgba(${hexToRgb(primaryHex)}, 0.2) !important;
        }
        
        .filter-active-btn {
          background-color: var(--secondary-color) !important;
          color: black !important;
          box-shadow: 0 0 18px rgba(${hexToRgb(secondaryHex)}, 0.45) !important;
        }
        
        .btn-play-dynamic {
          background-color: var(--primary-color) !important;
          color: white !important;
          transition: all 0.3s ease;
        }
        .btn-play-dynamic:hover {
          background-color: white !important;
          color: black !important;
        }
      `}</style>

      {/* --- BARRA SOCIAL FIXA --- */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[96%] max-w-[480px]">
        <div className="flex items-center justify-between bg-[#0a0a0a]/85 backdrop-blur-md border border-primary-dynamic rounded-full px-3 py-2 shadow-[0_0_15px_var(--primary-glow)]">
          <a href="#" className="flex flex-col items-center gap-1 group text-zinc-400 hover:text-white transition-all cursor-pointer w-16">
            <FaHome className="text-lg md:text-xl group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all" />
            <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider">Home</span>
          </a>
          <a href={configSite?.instagram || "#"} target="_blank" className="flex flex-col items-center gap-1 group text-zinc-400 hover:text-white transition-all cursor-pointer w-16">
            <FaInstagram className="text-lg md:text-xl group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all" />
            <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider">Instagram</span>
          </a>
          <a href={configSite?.telegram || "#"} target="_blank" className="flex flex-col items-center gap-1 group text-zinc-400 hover:text-white transition-all cursor-pointer w-16">
            <FaTelegram className="text-lg md:text-xl group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all" />
            <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wider">Telegram</span>
          </a>
          <a href={configSite?.whatsapp || "#"} target="_blank" className="flex items-center justify-center gap-1.5 bg-primary-dynamic text-black px-3 md:px-4 py-2 rounded-full font-black uppercase text-[10px] md:text-xs hover:scale-105 transition-all shadow-[0_0_15px_var(--primary-glow)] cursor-pointer ml-1">
            <FaWhatsapp className="text-base md:text-lg" />
            <span>Grupo VIP</span>
          </a>
        </div>
      </div>

      {/* --- SEÇÃO 01: HEADER E LANDING --- */}
      <section className="relative pt-28 pb-10 px-6">
        <header className="max-w-7xl mx-auto flex items-center justify-between mb-16" />

        <div className="max-w-7xl mx-auto text-center flex flex-col items-center space-y-8">
          <img
            src={aparencia?.banner_principal_url || aparencia?.logo_url || "/logo.webp"}
            alt={aparencia?.nome_site || "Slot da Sorte"}
            className="w-[200px] md:w-[360px] max-h-[160px] object-contain glow-primary-dynamic"
          />

          <h2 className="text-5xl md:text-7xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase max-w-4xl">
            {aparencia?.titulo_home ? (
              aparencia.titulo_home.split(" ").map((word: string, i: number, arr: string[]) => {
                const isHighlight = i >= arr.length - 2;
                return (
                  <span key={i} className={isHighlight ? "text-primary-dynamic" : "text-white"}>
                    {word}{" "}
                  </span>
                );
              })
            ) : (
              <>
                SINAIS DE SLOT EM <span className="text-primary-dynamic">TEMPO REAL</span>
              </>
            )}
          </h2>
        </div>

        {/* PLATAFORMAS INDICADAS */}
        <div className="mt-12 mb-4 text-center">
          <h3 className="text-3xl font-black uppercase tracking-wide text-primary-dynamic glow-primary-dynamic">
            PLATAFORMAS INDICADAS
          </h3>
        </div>

        <div
          className="border rounded-[32px] py-8 px-6 md:px-10 max-w-[95%] xl:max-w-7xl mx-auto overflow-visible shadow-[0_0_35px_rgba(0,255,102,0.15)] backdrop-blur-md"
          style={{
            backgroundColor: '#004d06',
            borderColor: 'rgba(0, 255, 102, 0.3)',
          }}
        >
          <div className="flex flex-row justify-center items-center flex-wrap gap-6 md:gap-10">
            {plataformas.map((p, i) => (
              <a
                key={i}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative w-[88px] h-[88px] md:w-[100px] md:h-[100px] rounded-[24px] border border-white/10 overflow-visible shadow-2xl transition-all duration-300 hover:scale-110 hover:border-white/40 active:scale-95 animate-platform-float"
              >
                <div
                  className="absolute -top-3 -right-2 text-[10px] px-3 py-[2px] rounded-full font-black uppercase shadow-lg z-20 text-white"
                  style={{
                    background: "linear-gradient(180deg, #7A4A3A 0%, #5A3428 100%)",
                    border: "1px solid rgba(255,255,255,.15)",
                    boxShadow: "0 2px 8px rgba(0,0,0,.35), inset 0 1px 2px rgba(255,255,255,0.2)"
                  }}
                >
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
      <section className="pt-10 pb-24 px-4">
        <div className="max-w-[1500px] mx-auto space-y-12">

          {/* CONTADOR */}
          <div
            className="relative w-full max-w-[400px] h-[120px] mx-auto rounded-[28px] border bg-counter-gradient shadow-[0_0_35px_rgba(34,197,94,0.15)] overflow-hidden flex items-center justify-center"
            style={{ borderColor: `rgba(${hexToRgb(primaryHex)}, 0.3)` }}
          >
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

              <p className="text-secondary-dynamic font-black text-[16px] whitespace-nowrap">
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
              className="w-full border rounded-[24px] py-5 px-8 text-center font-black text-[15px] text-white outline-none placeholder:text-zinc-500 transition-all duration-300 input-search-dynamic"
            />

            <div className="flex justify-center">
              <div className="bg-[#002811]/80 p-2 rounded-[22px] flex gap-2 border backdrop-blur-xl overflow-x-auto no-scrollbar shadow-[0_0_20px_rgba(0,255,102,0.04)] category-container-dynamic">
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoriaAtiva(c)}
                    className={`whitespace-nowrap px-7 py-3 rounded-full text-[12px] font-black uppercase transition-all duration-300 cursor-pointer ${categoriaAtiva === c
                        ? "filter-active-btn"
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
                      src={
                        j.imagemUrl && (j.imagemUrl.startsWith("http") || j.imagemUrl.startsWith("/"))
                          ? j.imagemUrl
                          : `https://reidoslotsinais.bet/images/games/${j.imagemUrl || j.id}.webp`
                      }
                      className="w-full h-full object-cover"
                      alt={j.nome}
                      loading={index < 8 ? "eager" : "lazy"}
                      decoding="async"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.dataset.fallback = "local";
                          e.currentTarget.src = `/jogos/${j.imagemUrl || j.id}.webp`;
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
                      className="absolute top-2 right-2 z-20 cursor-pointer"
                    >
                      {favoritos.includes(String(j.id)) ? (
                        <span className="text-red-500 text-xl drop-shadow-lg">❤️</span>
                      ) : (
                        <span className="text-white text-xl drop-shadow-lg">🤍</span>
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
                          corBarra = "bg-primary-dynamic";
                          sombraBarra = `shadow-[0_0_10px_${primaryHex}]`;
                        } else if (b.v >= 50) {
                          corBarra = "bg-secondary-dynamic";
                          sombraBarra = `shadow-[0_0_10px_${secondaryHex}]`;
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
                                className={`h-full ${corBarra} transition-all duration-500`}
                                style={{ boxShadow: b.v >= 50 ? `0 0 8px ${b.v >= 70 ? primaryHex : secondaryHex}` : undefined }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* BOX DE APOSTAS */}
                    <div className="bg-black/20 rounded-[24px] p-3 border border-white/5 space-y-3 mt-auto">
                      <p className="text-secondary-dynamic text-[10px] font-bold uppercase text-center">
                        Apostas
                      </p>

                      {(() => {
                        const s = calcularSugestoes(j.bets);

                        return (
                          <div className="space-y-3">
                            <div className="space-y-1 text-[10px] font-black text-white uppercase tracking-tighter">
                              <p className="text-center text-[10px] mb-1 tracking-widest text-zinc-500">MÍNIMA</p>
                              <div className="flex justify-between items-center">
                                <span>Bônus:</span>
                                <span className="bg-primary-dynamic text-black px-2 py-0.5 rounded-md font-bold">{s.bonus}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Conexão:</span>
                                <span className="bg-primary-dynamic text-black px-2 py-0.5 rounded-md font-bold">{s.conexao}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Bet Extra:</span>
                                <span className="bg-primary-dynamic text-black px-2 py-0.5 rounded-md font-bold">{s.extra}</span>
                              </div>
                            </div>

                            <div className="space-y-1 pt-1 border-t border-white/5">
                              <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">PADRÃO</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-primary-dynamic text-black text-center py-1.5 rounded-lg text-[11px] font-black">{s.p1}</div>
                                <div className="bg-primary-dynamic text-black text-center py-1.5 rounded-lg text-[11px] font-black">{s.p2}</div>
                              </div>
                            </div>

                            <div className="space-y-1 pt-1 border-t border-white/5">
                              <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">MÁXIMA</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-primary-dynamic text-black text-center py-1.5 rounded-lg text-[11px] font-black">{s.m1}</div>
                                <div className="bg-primary-dynamic text-black text-center py-1.5 rounded-lg text-[11px] font-black">{s.m2}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="w-[94%] mx-auto text-white font-bold text-[16px] py-2.5 rounded-full mt-2 mb-1 shadow-[0_4px_12px_rgba(22,163,74,0.25)] bg-gradient-to-b from-[#22C55E] to-[#16A34A] hover:brightness-110 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 ease-out flex items-center justify-center gap-2 cursor-pointer">
                      Jogar <Play size={14} className="fill-white text-white" />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- FOOTER PREMIUM --- */}
      <footer className="bg-[#060606] border-t border-primary-alpha pt-16 pb-8 px-6 relative mt-10" style={{ borderTop: '1px solid rgba(22,163,74,.25)' }}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        
        <div className="max-w-[1500px] mx-auto relative z-10">
          
          {/* PRIMEIRA LINHA */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
            
            {/* COLUNA 1 */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src={aparencia?.logo_url || CONFIG.logo} alt="Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
                <h1 className="font-black tracking-tighter text-2xl text-white">
                  {aparencia?.nome_site ? (
                    aparencia.nome_site.split(" ").map((w: string, i: number, arr: string[]) => {
                      const isLast = i === arr.length - 1;
                      return <span key={i} className={isLast ? "text-primary-dynamic" : "text-white"}>{w} </span>;
                    })
                  ) : (
                    <>SLOT <span className="text-primary-dynamic">DA SORTE</span></>
                  )}
                </h1>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">
                A plataforma de sinais mais confiável para jogadores de slots.
              </p>
              
              <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex items-start gap-4 mt-6">
                <div className="bg-primary-dynamic/10 p-2 rounded-lg text-primary-dynamic mt-1">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white text-sm font-bold">SINAIS EM TEMPO REAL</h4>
                    <span className="bg-primary-dynamic/20 text-primary-dynamic text-[9px] font-bold px-2 py-0.5 rounded-full border border-primary-dynamic/30">ONLINE</span>
                  </div>
                  <p className="text-zinc-500 text-xs">Atualizações automáticas durante todo o dia.</p>
                </div>
              </div>
            </div>

            {/* COLUNA 2 */}
            <div className="space-y-6 lg:pl-8">
              <h4 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                LINKS ÚTEIS
              </h4>
              <ul className="space-y-3 text-zinc-400 text-sm font-medium">
                <li><a href="#" className="hover:text-primary-dynamic transition-colors block">Home</a></li>
                <li><a href="#" className="hover:text-primary-dynamic transition-colors block">Sinais ao Vivo</a></li>
                <li><a href={configSite?.whatsapp || "#"} target="_blank" className="hover:text-primary-dynamic transition-colors block">Grupo VIP</a></li>
                <li><a href={configSite?.instagram || "#"} target="_blank" className="hover:text-primary-dynamic transition-colors block">Instagram</a></li>
                <li><a href={configSite?.telegram || "#"} target="_blank" className="hover:text-primary-dynamic transition-colors block">Telegram</a></li>
                <li className="pt-2"><a href="#" className="hover:text-primary-dynamic transition-colors block">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-primary-dynamic transition-colors block">Termos de Uso</a></li>
              </ul>
            </div>

            {/* COLUNA 3 */}
            <div className="space-y-6">
              <h4 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                JOGO RESPONSÁVEL
              </h4>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 shrink-0 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 font-black text-xs bg-[#0a0a0a]">
                  18+
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  As apostas podem causar dependência.<br />
                  Jogue com responsabilidade.<br />
                  Utilize apenas valores destinados ao entretenimento.
                </p>
              </div>
              <div className="bg-[#1a110b] border border-[#2a1b12] rounded-xl p-4 mt-4">
                <h5 className="text-white/90 text-sm font-bold mb-1">Precisa de ajuda?</h5>
                <p className="text-zinc-400 text-xs mb-2">Centro de Valorização da Vida</p>
                <div className="text-orange-500/90 font-black text-lg">Disque 188</div>
              </div>
            </div>

            {/* COLUNA 4 */}
            <div className="space-y-6">
              <h4 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                AVISO LEGAL
              </h4>
              <ul className="space-y-3 text-xs text-zinc-400 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold shrink-0 mt-0.5">❌</span> Não garantimos lucros.</li>
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold shrink-0 mt-0.5">❌</span> Não operamos plataformas.</li>
                <li className="flex items-start gap-2"><span className="text-primary-dynamic font-bold shrink-0 mt-0.5">✅</span> Somos uma plataforma de sinais online.</li>
                <li className="flex items-start gap-2"><span className="text-yellow-500 font-bold shrink-0 mt-0.5">⚠️</span> O uso é de responsabilidade exclusiva do usuário.</li>
              </ul>
            </div>

          </div>

          {/* SEGUNDA LINHA: DIFERENCIAIS */}
          <div className="border-t border-white/5 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
              
              <div className="flex items-center gap-4 sm:px-6 first:pl-0 pt-4 sm:pt-0 first:pt-0">
                <div className="text-primary-dynamic bg-primary-dynamic/10 p-2.5 rounded-lg"><ShieldCheck size={20} /></div>
                <div>
                  <h5 className="text-white text-sm font-bold">Site Seguro</h5>
                  <p className="text-zinc-500 text-xs">Conexão protegida por HTTPS e navegação segura.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:px-6 pt-4 sm:pt-0">
                <div className="text-primary-dynamic bg-primary-dynamic/10 p-2.5 rounded-lg"><RefreshCw size={20} /></div>
                <div>
                  <h5 className="text-white text-sm font-bold">Atualização Contínua</h5>
                  <p className="text-zinc-500 text-xs">Sinais renovados automaticamente ao longo do dia.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:px-6 pt-4 sm:pt-0">
                <div className="text-primary-dynamic bg-primary-dynamic/10 p-2.5 rounded-lg"><Smartphone size={20} /></div>
                <div>
                  <h5 className="text-white text-sm font-bold">Compatível com Celular</h5>
                  <p className="text-zinc-500 text-xs">Acesse a plataforma em qualquer dispositivo.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:px-6 pt-4 sm:pt-0">
                <div className="text-primary-dynamic bg-primary-dynamic/10 p-2.5 rounded-lg"><Activity size={20} /></div>
                <div>
                  <h5 className="text-white text-sm font-bold flex items-center gap-1.5">
                    Sistema Online
                    <span className="flex items-center gap-1 bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ml-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1 w-1 bg-green-500 mx-auto mt-[1px]"></span>
                      </span>
                      Online
                    </span>
                  </h5>
                  <p className="text-zinc-500 text-xs">Disponível 24 horas por dia.</p>
                </div>
              </div>

            </div>
          </div>

          {/* TERCEIRA LINHA: COPYRIGHT & SOCIAIS */}
          <div className="border-t border-white/5 pt-8 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
            <div className="text-zinc-500 text-xs font-medium">
              © 2026 Slot da Sorte. Todos os direitos reservados.
            </div>
            
            <div className="text-zinc-500 text-xs font-medium">
              Desenvolvido com <span className="text-red-500">❤️</span> para a comunidade.
            </div>

            <div className="flex items-center gap-4">
              <a href={configSite?.instagram || "#"} target="_blank" className="text-zinc-500 hover:text-primary-dynamic transition-colors">
                <FaInstagram size={20} />
              </a>
              <a href={configSite?.telegram || "#"} target="_blank" className="text-zinc-500 hover:text-primary-dynamic transition-colors">
                <FaTelegram size={20} />
              </a>
              <a href={configSite?.whatsapp || "#"} target="_blank" className="text-zinc-500 hover:text-primary-dynamic transition-colors">
                <FaWhatsapp size={20} />
              </a>
            </div>
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

            <label className="flex items-center gap-2 mt-3 mb-3 text-white text-sm px-2 cursor-pointer">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    localStorage.setItem("popup-plataforma", "true");
                  } else {
                    localStorage.removeItem("popup-plataforma");
                  }
                }}
                className="w-4 h-4 cursor-pointer"
              />
              Não mostrar mais esta mensagem
            </label>

            <div className="flex gap-3">
              <a
                href={configSite?.popup_link || "#"}
                target="_blank"
                className="flex-1 h-11 bg-[#0d8bff] hover:bg-[#2498ff] transition-all text-white font-bold text-center text-sm rounded-[12px] flex items-center justify-center cursor-pointer"
              >
                {aparencia?.texto_cta || "Acessar Plataforma"}
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
                className="flex-1 h-11 bg-[#ff9800] hover:bg-[#ffad33] transition-all text-white font-bold text-sm rounded-[12px] cursor-pointer"
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
          <div className="bg-[#9BE15D] text-black rounded-2xl shadow-2xl overflow-hidden border border-black/10" style={{ backgroundColor: primaryHex }}>
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
                  <div className="text-[11px] opacity-80 font-semibold">
                    Entre agora e receba sinais ao vivo
                  </div>
                </div>
              </a>

              <button
                onClick={() => {
                  localStorage.setItem("fechar-whatsapp-bar", "true");
                  setMostrarWhatsAppBar(false);
                }}
                className="text-black text-lg font-bold cursor-pointer"
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
