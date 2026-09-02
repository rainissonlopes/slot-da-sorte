"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import { AlertCircle, LayoutGrid, RotateCcw, X } from "lucide-react";
import { GameFilters } from "@/components/signals/GameFilters";
import { GamesGrid } from "@/components/signals/GamesGrid";
import { MobileCatalogNav } from "@/components/signals/MobileCatalogNav";
import { PromotionalBanner } from "@/components/signals/PromotionalBanner";
import { RecommendedPlatforms } from "@/components/signals/RecommendedPlatforms";
import { SectionHeading } from "@/components/signals/SectionHeading";
import { SiteFooter } from "@/components/signals/SiteFooter";
import { SiteHeader } from "@/components/signals/SiteHeader";
import { TrendingGames } from "@/components/signals/TrendingGames";
import { WhatsAppBanner } from "@/components/signals/WhatsAppBanner";
import {
  formatCountdown,
  getCatalogBatchSize,
  getNextCatalogLimit,
  getVisibleCatalogCount,
  getVisibleCatalogItems,
  MOBILE_CATALOG_BATCH,
} from "@/lib/signals/catalog-pagination";
import { resolveAppearanceV2, resolveSiteV2 } from "@/lib/signals/config-v2";
import { supabase } from "@/lib/supabase";
import type {
  Aparencia,
  ConfigSite,
  EstadoJogo,
  GameMediaRow,
  Jogo,
  Plataforma,
  SinalRow,
  SiteSectionId,
  SugestoesAposta,
  TendenciaJogo,
} from "@/lib/signals/types";

const CACHE_KEY = "slotCards";
const CICLO_SEGUNDOS = 300;
const CICLO_MS = CICLO_SEGUNDOS * 1000;

const calcularSugestoes = (bets: string[]): SugestoesAposta => {
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

const limitar = (valor: number, min: number, max: number) =>
  Math.min(max, Math.max(min, valor));

const LIMITES_ESTADO = {
  Frio: { dist: [35, 65], min: [10, 35], pad: [15, 45], max: [20, 55] },
  Neutro: { dist: [55, 80], min: [25, 60], pad: [35, 70], max: [30, 75] },
  Aquecendo: { dist: [70, 92], min: [45, 80], pad: [55, 85], max: [50, 90] },
  Quente: { dist: [85, 98], min: [70, 98], pad: [65, 96], max: [60, 98] },
};

function obterPersonalidade(nome: string) {
  const nomeLower = nome.toLowerCase();
  let chanceQuente = 0;
  let volatilidade = Math.floor(Math.random() * 2) + 1;
  const palavrasQuentes = ["fortune", "tiger", "dragon", "ox", "rabbit", "mouse", "mahjong", "ways", "gold", "bonanza"];
  const palavrasVolateis = ["doomsday", "rampage", "wild", "mystery", "chaos", "halloween"];

  if (palavrasQuentes.some((palavra) => nomeLower.includes(palavra))) {
    chanceQuente = 40;
  }
  if (palavrasVolateis.some((palavra) => nomeLower.includes(palavra))) {
    volatilidade = Math.floor(Math.random() * 3) + 3;
  }
  return { chanceQuente, volatilidade };
}

function randomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gerarEstadoInicial(nome: string): {
  estado: EstadoJogo;
  tendencia: TendenciaJogo;
  dist: number;
  min: number;
  pad: number;
  max: number;
  volatilidade: number;
} {
  const { chanceQuente, volatilidade } = obterPersonalidade(nome);
  const rand = Math.random() * 100;
  let estado: EstadoJogo = "Neutro";

  if (chanceQuente > 0) {
    if (rand < 5) estado = "Frio";
    else if (rand < 25) estado = "Neutro";
    else if (rand < 75) estado = "Aquecendo";
    else estado = "Quente";
  } else {
    if (rand < 15) estado = "Frio";
    else if (rand < 60) estado = "Neutro";
    else if (rand < 90) estado = "Aquecendo";
    else estado = "Quente";
  }

  const tendencias: TendenciaJogo[] = ["Subindo", "Estável", "Caindo"];
  const tendencia = tendencias[Math.floor(Math.random() * tendencias.length)];
  const limites = LIMITES_ESTADO[estado];
  return {
    estado,
    tendencia,
    dist: randomInRange(limites.dist[0], limites.dist[1]),
    min: randomInRange(limites.min[0], limites.min[1]),
    pad: randomInRange(limites.pad[0], limites.pad[1]),
    max: randomInRange(limites.max[0], limites.max[1]),
    volatilidade,
  };
}

function evoluirValores(jogo: Jogo): Jogo {
  if (!jogo.estado || !jogo.tendencia || !jogo.volatilidade) {
    const init = gerarEstadoInicial(jogo.nome);
    return { ...jogo, ...init };
  }

  let { estado, tendencia, dist, min, pad, max } = jogo;
  const { volatilidade } = jogo;
  if (Math.random() < 0.1) {
    const tendencias: TendenciaJogo[] = ["Subindo", "Estável", "Caindo"];
    tendencia = tendencias[Math.floor(Math.random() * tendencias.length)];
  }

  const varRange = volatilidade;
  const gerarVariacao = () => {
    if (tendencia === "Subindo") return randomInRange(0, varRange);
    if (tendencia === "Caindo") return randomInRange(-varRange, 0);
    return randomInRange(-Math.ceil(varRange / 2), Math.ceil(varRange / 2));
  };

  dist = limitar(dist + gerarVariacao(), LIMITES_ESTADO[estado].dist[0], LIMITES_ESTADO[estado].dist[1]);
  min = limitar(min + gerarVariacao(), LIMITES_ESTADO[estado].min[0], LIMITES_ESTADO[estado].min[1]);
  pad = limitar(pad + gerarVariacao(), LIMITES_ESTADO[estado].pad[0], LIMITES_ESTADO[estado].pad[1]);
  max = limitar(max + gerarVariacao(), LIMITES_ESTADO[estado].max[0], LIMITES_ESTADO[estado].max[1]);

  const estadosOrder: EstadoJogo[] = ["Frio", "Neutro", "Aquecendo", "Quente"];
  const currentIndex = estadosOrder.indexOf(estado);
  if (tendencia === "Subindo" && dist >= LIMITES_ESTADO[estado].dist[1] - (varRange + 1) && currentIndex < 3) {
    if (Math.random() < 0.3) estado = estadosOrder[currentIndex + 1];
  } else if (tendencia === "Caindo" && dist <= LIMITES_ESTADO[estado].dist[0] + (varRange + 1) && currentIndex > 0) {
    if (Math.random() < 0.3) estado = estadosOrder[currentIndex - 1];
  }
  return { ...jogo, estado, tendencia, dist, min, pad, max };
}

function hashString(str: string) {
  let hash = 0;
  for (let index = 0; index < str.length; index += 1) {
    hash = (Math.imul(31, hash) + str.charCodeAt(index)) | 0;
  }
  return hash;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "22, 163, 74";
}

function normalizeExternalLink(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const phone = trimmed.replace(/\D/g, "");
  return phone.length >= 10 ? `https://wa.me/${phone}` : undefined;
}

function normalizeWhatsAppLink(value?: string, message?: string) {
  const link = normalizeExternalLink(value);
  if (!link || !message) return link;
  try {
    const url = new URL(link);
    if (url.hostname === "wa.me" || url.hostname.endsWith(".wa.me")) {
      url.searchParams.set("text", message);
      return url.toString();
    }
  } catch {
    return link;
  }
  return link;
}

function normalizeGameName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function normalizeGameProvider(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "PG") return "pg";
  if (normalized === "PP") return "pp";
  if (normalized === "TADA") return "tada";
  if (normalized === "WG") return "wg";
  return normalized.toLowerCase();
}

export default function Home() {
  const [mostrarPopup, setMostrarPopup] = useState(false);
  const [favoritos, setFavoritos] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const salvos = window.localStorage.getItem("favoritos");
    if (!salvos) return [];
    try {
      return JSON.parse(salvos) as string[];
    } catch {
      window.localStorage.removeItem("favoritos");
      return [];
    }
  });
  const [configSite, setConfigSite] = useState<ConfigSite | null>(null);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [aparencia, setAparencia] = useState<Aparencia | null>(null);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");
  const [montado, setMontado] = useState(false);
  const [erroSinais, setErroSinais] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("");
  const [proximaAtualizacao, setProximaAtualizacao] = useState(CICLO_SEGUNDOS);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [catalogBatchSize, setCatalogBatchSize] = useState(MOBILE_CATALOG_BATCH);
  const [visibleCatalogLimit, setVisibleCatalogLimit] = useState(MOBILE_CATALOG_BATCH);
  const carregadoRef = useRef(false);
  const catalogBatchRef = useRef(MOBILE_CATALOG_BATCH);
  const categorias = ["Todos", "PG Games", "PP Games", "WG Games", "Favoritos"];

  useEffect(() => {
    const updateCatalogBatch = () => {
      const nextBatch = getCatalogBatchSize(window.innerWidth);
      if (catalogBatchRef.current === nextBatch) return;
      catalogBatchRef.current = nextBatch;
      setCatalogBatchSize(nextBatch);
      setVisibleCatalogLimit(nextBatch);
    };
    updateCatalogBatch();
    window.addEventListener("resize", updateCatalogBatch);
    return () => window.removeEventListener("resize", updateCatalogBatch);
  }, []);

  useEffect(() => {
    async function carregarConfig() {
      try {
        const [
          { data: configData, error: configError },
          { data: platformsData, error: platformsError },
        ] = await Promise.all([
          supabase.from("config_site").select("*").limit(1).maybeSingle<ConfigSite>(),
          supabase.from("plataformas").select("*").order("ordem", { ascending: true }).returns<Plataforma[]>(),
        ]);
        if (configData) setConfigSite(configData);
        if (configError) console.warn("[Config] config_site indisponível:", configError.message);
        if (platformsData) setPlataformas(platformsData.filter((platform) => platform.ativo !== false));
        if (platformsError) console.warn("[Config] plataformas indisponíveis:", platformsError.message);

        let domain = window.location.hostname;
        if (domain.includes("localhost") || domain.includes("127.0.0.1")) domain = "default";
        const { data: domainAppearance, error: appearanceError } = await supabase
          .from("aparencia")
          .select("*")
          .eq("domain", domain)
          .maybeSingle<Aparencia>();

        let appearanceData = domainAppearance;
        if (!appearanceData || appearanceError) {
          const { data: defaultAppearance, error: defaultAppearanceError } = await supabase
            .from("aparencia")
            .select("*")
            .eq("domain", "default")
            .maybeSingle<Aparencia>();
          appearanceData = defaultAppearance;
          if (defaultAppearanceError) {
            console.warn("[Config] aparência padrão indisponível:", defaultAppearanceError.message);
          }
        }
        if (appearanceData) setAparencia(appearanceData);
      } catch (error) {
        console.warn("[Config] configurações opcionais não puderam ser carregadas:", error);
      }
    }
    carregarConfig();
  }, []);

  useEffect(() => {
    if (aparencia?.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = aparencia.favicon_url;
    }
    if (aparencia?.nome_site) document.title = aparencia.nome_site;
  }, [aparencia]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!localStorage.getItem("popup-plataforma")) setMostrarPopup(true);
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, []);

  const toggleFavorito = (id: string) => {
    const novosFavoritos = favoritos.includes(id)
      ? favoritos.filter((favorito) => favorito !== id)
      : [...favoritos, id];
    setFavoritos(novosFavoritos);
    localStorage.setItem("favoritos", JSON.stringify(novosFavoritos));
  };

  const carregarCards = useCallback(async (forcarAtualizacao = false) => {
    setErroSinais(null);
    let cacheDisponivel: Jogo[] = [];
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const dadosSalvos = localStorage.getItem(CACHE_KEY);
      let cacheJogos: Jogo[] = [];
      let cacheValido = false;
      let cacheTimestamp = Date.now();
      let tempoRestante = CICLO_SEGUNDOS;

      if (dadosSalvos && !forcarAtualizacao) {
        try {
          const parsed = JSON.parse(dadosSalvos) as {
            jogos?: Jogo[];
            timestamp: number;
            ultimaAtualizacao: string;
          };
          const tempoPassado = Date.now() - parsed.timestamp;
          if (parsed.jogos && tempoPassado < CICLO_MS) {
            cacheJogos = parsed.jogos;
            cacheDisponivel = parsed.jogos;
            cacheValido = true;
            cacheTimestamp = parsed.timestamp;
            tempoRestante = Math.max(1, Math.floor((CICLO_MS - tempoPassado) / 1000));
          }
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }
      }

      const [
        { data: sinaisData, error: sinaisError },
        { data: gameMediaData, error: gameMediaError },
      ] = await Promise.all([
        supabase
          .from("sinais")
          .select("*")
          .abortSignal(controller.signal)
          .returns<SinalRow[]>(),
        supabase
          .from("games")
          .select("*")
          .eq("source", "rei-dos-slots")
          .abortSignal(controller.signal)
          .returns<GameMediaRow[]>(),
      ]);
      if (sinaisError) {
        console.error("[Sinais] erro da consulta:", sinaisError.message);
        throw sinaisError;
      }
      if (gameMediaError) console.warn("[Games] catálogo normalizado indisponível; usando compatibilidade legada:", gameMediaError.message);
      const mediaByIdentity = new Map(
        (gameMediaData || []).map((game) => [
          `${game.provider_normalized}:${game.name_normalized}`,
          {
            cover: game.storage_image_url || undefined,
            icon: game.storage_icon_url || undefined,
            themeColor: game.theme_color || undefined,
          },
        ]),
      );
      const mediaById = new Map(
        (gameMediaData || []).map((game) => [
          Number(game.id),
          {
            cover: game.storage_image_url || undefined,
            icon: game.storage_icon_url || undefined,
            themeColor: game.theme_color || undefined,
          },
        ]),
      );
      const currentTimestamp = cacheValido ? cacheTimestamp : Date.now();

      const jogosFormatados: Jogo[] = (sinaisData || [])
        .filter((sinal) => sinal.ativo !== false)
        .map((sinal, index) => {
          const cachedGame = cacheValido
            ? cacheJogos.find((game) => String(game.id) === String(sinal.id))
            : null;
          const plataforma = plataformas.length ? plataformas[index % plataformas.length] : undefined;
          const media = (sinal.game_id ? mediaById.get(Number(sinal.game_id)) : undefined)
            || mediaByIdentity.get(`${normalizeGameProvider(sinal.categoria_jogo)}:${normalizeGameName(sinal.nome_jogo)}`);
          let baseGame: Jogo = {
            id: sinal.id,
            nome: sinal.nome_jogo,
            cat: sinal.categoria_jogo === "PG" ? "PG Games" : sinal.categoria_jogo === "PP" ? "PP Games" : "WG Games",
            dist: 0,
            min: 0,
            pad: 0,
            max: 0,
            cor: sinal.cor_background,
            link: plataforma?.link || "#",
            plataforma,
            bets: sinal.bets || [],
            imagemUrl: sinal.imagem_url,
            imagemPersonalizada: sinal.imagem_personalizada === true,
            storageImageUrl: media?.cover,
            storageIconUrl: media?.icon,
            themeColor: media?.themeColor,
            destaque: sinal.destaque === true,
          };

          if (cachedGame) {
            baseGame = evoluirValores({
              ...baseGame,
              dist: cachedGame.dist,
              min: cachedGame.min,
              pad: cachedGame.pad,
              max: cachedGame.max,
              estado: cachedGame.estado,
              tendencia: cachedGame.tendencia,
              volatilidade: cachedGame.volatilidade,
            });
          } else {
            baseGame = { ...baseGame, ...gerarEstadoInicial(sinal.nome_jogo) };
          }
          return baseGame;
        })
        .sort((a, b) => {
          const hashA = hashString(a.id.toString() + currentTimestamp.toString());
          const hashB = hashString(b.id.toString() + currentTimestamp.toString());
          return hashA - hashB;
        });

      const parsedCache = dadosSalvos
        ? (JSON.parse(dadosSalvos) as { ultimaAtualizacao?: string })
        : null;
      const horaAtualizacao = cacheValido && parsedCache?.ultimaAtualizacao
        ? parsedCache.ultimaAtualizacao
        : new Date().toLocaleTimeString("pt-BR");

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        jogos: jogosFormatados,
        ultimaAtualizacao: horaAtualizacao,
        timestamp: currentTimestamp,
      }));
      setJogos(jogosFormatados);
      setUltimaAtualizacao(horaAtualizacao);
      setProximaAtualizacao(cacheValido ? tempoRestante : CICLO_SEGUNDOS);
    } catch (error) {
      console.error("ERRO CARDS:", error);
      if (cacheDisponivel.length > 0) {
        setJogos(cacheDisponivel);
      } else {
        setJogos([]);
        setErroSinais("Não foi possível conectar ao serviço de sinais.");
      }
    } finally {
      window.clearTimeout(timeout);
      setMontado(true);
    }
  }, [plataformas]);

  useEffect(() => {
    if (carregadoRef.current) return;
    carregadoRef.current = true;
    carregarCards(false);
  }, [carregarCards]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProximaAtualizacao((tempo) => {
        if (tempo <= 1) {
          carregarCards(true);
          return CICLO_SEGUNDOS;
        }
        return tempo - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [carregarCards]);

  const filtrados = useMemo(() => {
    const texto = busca.toLowerCase().trim();
    return jogos.filter((jogo) => {
      const bateBusca = jogo.nome.toLowerCase().includes(texto);
      const bateCategoria = categoriaAtiva === "Todos"
        || (categoriaAtiva === "Favoritos" ? favoritos.includes(String(jogo.id)) : jogo.cat === categoriaAtiva);
      return bateBusca && bateCategoria;
    });
  }, [busca, categoriaAtiva, jogos, favoritos]);

  const jogosVisiveis = useMemo(
    () => getVisibleCatalogItems(filtrados, visibleCatalogLimit),
    [filtrados, visibleCatalogLimit],
  );
  const visibleCatalogCount = getVisibleCatalogCount(visibleCatalogLimit, filtrados.length);
  const hasMoreCatalogGames = visibleCatalogCount < filtrados.length;

  const handleBusca = useCallback((value: string) => {
    setBusca(value);
    setVisibleCatalogLimit(catalogBatchSize);
  }, [catalogBatchSize]);

  const handleCategoria = useCallback((value: string) => {
    setCategoriaAtiva(value);
    setVisibleCatalogLimit(catalogBatchSize);
  }, [catalogBatchSize]);

  const handleMobileCategoria = useCallback((value: string) => {
    handleCategoria(value);

    const catalog = document.getElementById("todos-os-jogos");
    if (!catalog) return;

    const headerOffset = 80;
    const bounds = catalog.getBoundingClientRect();
    const catalogIsVisible = bounds.top <= headerOffset && bounds.bottom > headerOffset;
    if (catalogIsVisible) return;

    window.requestAnimationFrame(() => {
      const top = catalog.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }, [handleCategoria]);

  const jogosEmAlta = useMemo(() => {
    const prioridadeEstado: Record<EstadoJogo, number> = { Quente: 4, Aquecendo: 3, Neutro: 2, Frio: 1 };
    return [...jogos].sort((a, b) => {
      const destaque = Number(b.destaque === true) - Number(a.destaque === true);
      if (destaque !== 0) return destaque;
      const estado = prioridadeEstado[b.estado || "Neutro"] - prioridadeEstado[a.estado || "Neutro"];
      if (estado !== 0) return estado;
      if (b.dist !== a.dist) return b.dist - a.dist;
      return Number(b.tendencia === "Subindo") - Number(a.tendencia === "Subindo");
    }).slice(0, 8);
  }, [jogos]);

  const primary = aparencia?.cor_primaria || "#16A34A";
  const secondary = aparencia?.cor_secundaria || "#22C55E";
  const appearanceConfig = resolveAppearanceV2(aparencia);
  const siteConfig = resolveSiteV2(configSite);
  const action = appearanceConfig.buttonColor;
  const whatsappLink = normalizeWhatsAppLink(siteConfig.whatsappNumber, siteConfig.whatsappMessage);
  const siteSections = siteConfig.sections.filter((section) => section.ativo);
  const tenantStyles = {
    "--tenant-primary": primary,
    "--tenant-secondary": secondary,
    "--tenant-background": appearanceConfig.backgroundColor,
    "--tenant-surface": appearanceConfig.cardColor,
    "--tenant-text": "#f7faf8",
    "--tenant-muted": "#9ba8a0",
    "--tenant-primary-rgb": hexToRgb(primary),
    "--tenant-action": action,
    "--tenant-action-hover": `color-mix(in srgb, ${action} 84%, white)`,
    "--tenant-action-active": `color-mix(in srgb, ${action} 82%, black)`,
    "--tenant-action-text": "#ffffff",
  } as React.CSSProperties;

  const renderSiteSection = (id: SiteSectionId) => {
    switch (id) {
      case "banner":
        return <PromotionalBanner desktopImageUrl={appearanceConfig.bannerUrl || "/banners/whatsapp-v2.webp"} fallbackImageUrl="/banners/whatsapp-v2.webp" href={normalizeExternalLink(appearanceConfig.bannerLink) || whatsappLink || normalizeExternalLink(configSite?.popup_link)} target="_blank" active={appearanceConfig.bannerActive} alt={`Campanha ${aparencia?.nome_site || "da plataforma"}`} />;
      case "plataformas":
        return <RecommendedPlatforms plataformas={plataformas} />;
      case "distribuicoes":
        return <div id="jogos-em-alta"><TrendingGames jogos={jogosEmAlta} /></div>;
      case "busca":
        return <GameFilters busca={busca} onBusca={handleBusca} categorias={categorias} categoriaAtiva={categoriaAtiva} onCategoria={handleCategoria} />;
      case "catalogo":
        return <section id="todos-os-jogos" aria-label="Todos os jogos"><SectionHeading icon={<LayoutGrid aria-hidden="true" />} eyebrow="Catálogo completo" title="Todos os jogos" action={<p className="w-full max-w-full rounded-lg border border-emerald-500/25 bg-zinc-950/70 px-3 py-2 text-center text-[11px] font-semibold leading-4 text-white shadow-sm sm:w-auto sm:max-w-md sm:text-right" aria-live="polite">Atualizado às <span className="font-bold tabular-nums text-emerald-300">{ultimaAtualizacao}</span> · próximo ciclo em <span className="font-bold tabular-nums text-emerald-300">{formatCountdown(proximaAtualizacao)}</span></p>} /><GamesGrid jogos={jogosVisiveis} favoritos={favoritos} onFavorito={toggleFavorito} calcularSugestoes={calcularSugestoes} emptyText={jogos.length === 0 ? "Carregamento concluído, mas nenhum jogo está disponível no momento." : categoriaAtiva === "Favoritos" ? "Nenhum jogo favorito ainda." : "Nenhum jogo corresponde à busca ou ao filtro selecionado."} />{filtrados.length > 0 && <div className="mt-7 flex flex-col items-center gap-3" aria-live="polite"><p className="text-xs font-semibold text-[var(--tenant-muted)]">Exibindo {visibleCatalogCount} de {filtrados.length} jogos</p>{hasMoreCatalogGames ? <button type="button" aria-label={`Carregar mais ${Math.min(catalogBatchSize, filtrados.length - visibleCatalogCount)} jogos`} onClick={() => setVisibleCatalogLimit((current) => getNextCatalogLimit(current, catalogBatchSize, filtrados.length))} className="signal-button w-full max-w-xs px-6 py-3 sm:w-auto sm:min-w-56">Carregar mais jogos</button> : <p className="text-xs font-semibold text-white/55">Todos os jogos foram exibidos</p>}</div>}</section>;
      case "cta_whatsapp":
        return !siteConfig.ctaActive ? null : <WhatsAppBanner whatsapp={whatsappLink} title={siteConfig.ctaTitle} description={siteConfig.ctaDescription} buttonText={siteConfig.ctaButtonText} />;
      case "footer":
        return <SiteFooter aparencia={aparencia} config={configSite ? { ...configSite, whatsapp: whatsappLink } : { whatsapp: whatsappLink }} footerText={appearanceConfig.footerText} />;
      default:
        return null;
    }
  };

  if (!montado) {
    return <main className="grid min-h-screen place-items-center bg-[#020806] text-white"><div className="text-center"><img src={aparencia?.logo_url || "/logo.webp"} alt="" className="mx-auto h-20 w-20 animate-pulse object-contain" /><h1 className="mt-5 text-xl font-black">Carregando sinais...</h1><p className="mt-2 text-sm text-white/55">Preparando os melhores jogos do momento</p></div></main>;
  }

  if (erroSinais) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020806] px-4 text-white" style={tenantStyles}>
        <div className="signal-surface w-full max-w-md p-7 text-center">
          <AlertCircle className="mx-auto text-red-400" size={42} />
          <h1 className="mt-5 text-2xl font-black">Não foi possível carregar os sinais</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--tenant-muted)]">
            Verifique sua conexão e as configurações do Supabase. Você pode tentar novamente agora.
          </p>
          <button
            type="button"
            onClick={() => {
              setMontado(false);
              carregarCards(true);
            }}
            className="signal-button mt-6 px-5 py-3"
          >
            <RotateCcw size={17} /> Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="signals-page min-h-screen overflow-x-hidden" style={tenantStyles}>
      <div className="fixed-bg" />
      <SiteHeader aparencia={aparencia} whatsapp={whatsappLink} buttonText={siteConfig.headerButtonText} active={siteConfig.headerActive} socialItems={siteConfig.socialNav} />
      <div className="mobile-catalog-content space-y-12 py-4 sm:space-y-20 sm:py-10">
        {siteSections.map((section) => section.id === "footer"
          ? <div key={section.id}>{renderSiteSection(section.id)}</div>
          : <div key={section.id} className="mx-auto max-w-7xl px-4 sm:px-6">{renderSiteSection(section.id)}</div>)}
      </div>

      <MobileCatalogNav categoriaAtiva={categoriaAtiva} onCategoria={handleMobileCategoria} />

      {mostrarPopup && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Oferta de plataforma">
          <div className="w-full max-w-xs">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border border-white/10 bg-black">
              <img src="/popup-427win.webp" alt="Oferta da plataforma" className="h-full w-full object-cover" />
              <button onClick={() => setMostrarPopup(false)} aria-label="Fechar" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/65"><X size={19} /></button>
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" onChange={(event) => event.target.checked ? localStorage.setItem("popup-plataforma", "true") : localStorage.removeItem("popup-plataforma")} /> Não mostrar novamente</label>
            <div className="mt-3 flex gap-2">
              <a href={configSite?.popup_link || "#"} target="_blank" rel="noopener noreferrer" className="signal-button flex-1 py-3">{aparencia?.texto_cta || "Acessar plataforma"}</a>
              {whatsappLink && <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="signal-action-icon grid h-12 w-12 place-items-center rounded-xl"><FaWhatsapp size={20} /></a>}
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
}
