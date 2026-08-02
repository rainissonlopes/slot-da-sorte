"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  FiGrid, 
  FiLayers, 
  FiPlayCircle, 
  FiSettings, 
  FiLogOut, 
  FiSearch, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiCheck, 
  FiGlobe, 
  FiMessageSquare, 
  FiRefreshCw,
  FiCpu,
  FiMenu,
  FiX,
  FiArrowUp,
  FiArrowDown,
  FiEye,
  FiImage,
  FiStar
} from "react-icons/fi";
import { applyGameImageFallback, buildGameImageCandidates, GAME_IMAGE_PLACEHOLDER, resolveGameImage } from "@/lib/signals/resolve-game-image";
import { HeaderSocialLinks } from "@/components/signals/SocialNavigation";
import { getGameThemeStyle, normalizeGameThemeColor, normalizeLegacySignalColor, resolveGameThemeColor } from "@/lib/signals/game-theme";
import { DEFAULT_SITE_SECTIONS } from "@/lib/signals/site-sections";
import {
  asJsonObject,
  mergeAppearanceV2,
  mergeSiteV2,
  resolveAppearanceV2,
  resolveSiteV2,
  type JsonObject,
} from "@/lib/signals/config-v2";
import type { GameMediaRow, Plataforma, SinalRow, SiteSectionConfig, SocialNavId, SocialNavItemConfig } from "@/lib/signals/types";

const EDITABLE_SOCIAL_IDS: SocialNavId[] = ["instagram", "telegram", "tiktok"];

function normalizeAdminName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function normalizeAdminProvider(value: string) {
  return value.trim().toLowerCase().replace(" games", "");
}

function findAssociatedGame(signal: SinalRow, games: GameMediaRow[]) {
  if (signal.game_id) {
    const byId = games.find((game) => Number(game.id) === Number(signal.game_id));
    if (byId) return byId;
  }
  const provider = normalizeAdminProvider(signal.categoria_jogo || "");
  const name = normalizeAdminName(signal.nome_jogo || "");
  return games.find((game) => game.provider_normalized === provider && game.name_normalized === name) || null;
}

function getSignalImageInfo(signal: SinalRow, games: GameMediaRow[]) {
  const game = findAssociatedGame(signal, games);
  const src = resolveGameImage({
    gameId: signal.id,
    category: signal.categoria_jogo,
    storageImageUrl: game?.storage_image_url,
    storageIconUrl: game?.storage_icon_url,
    rawImageUrl: signal.imagem_url,
  });
  return { src, game, placeholder: src === GAME_IMAGE_PLACEHOLDER };
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs font-bold text-zinc-300"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-500" /></label>;
}

export default function AdminPage() {
  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  // Navigation and Layout states
  const [activeTab, setActiveTab] = useState("overview"); // overview | platforms | signals | config | appearance
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState("");

  // Storage uploads loading state
  const [uploading, setUploading] = useState<string | null>(null);

  // Site Configuration states
  const [whatsapp, setWhatsapp] = useState("");
  const [popupLink, setPopupLink] = useState("");
  const [whatsappMensagem, setWhatsappMensagem] = useState("");
  const [headerBotaoTexto, setHeaderBotaoTexto] = useState("WhatsApp");
  const [ctaTitulo, setCtaTitulo] = useState("Receba os sinais no WhatsApp");
  const [ctaDescricao, setCtaDescricao] = useState("Entre no grupo e receba atualizações, jogos em alta e novos sinais.");
  const [ctaBotaoTexto, setCtaBotaoTexto] = useState("Entrar no grupo");
  const [headerAtivo, setHeaderAtivo] = useState(true);
  const [ctaAtivo, setCtaAtivo] = useState(true);
  const [siteSections, setSiteSections] = useState<SiteSectionConfig[]>(DEFAULT_SITE_SECTIONS);
  const [socialNav, setSocialNav] = useState<SocialNavItemConfig[]>(() => resolveSiteV2(null).socialNav);
  const [configSiteV2, setConfigSiteV2] = useState<JsonObject>({});

  // Appearance settings states (white-label)
  const [nomeSite, setNomeSite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#00ff66");
  const [corSecundaria, setCorSecundaria] = useState("#FFC801");
  const [tituloHome, setTituloHome] = useState("");
  const [subtituloHome, setSubtituloHome] = useState("");
  const [textoCta, setTextoCta] = useState("");
  const [bannerPrincipalUrl, setBannerPrincipalUrl] = useState("");
  const [corBotoes, setCorBotoes] = useState("#00a63e");
  const [corFundo, setCorFundo] = useState("#050806");
  const [corCards, setCorCards] = useState("#101512");
  const [textoRodape, setTextoRodape] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerAtivo, setBannerAtivo] = useState(true);
  const [appearanceV2, setAppearanceV2] = useState<JsonObject>({});

  // Platforms states
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [nomePlataforma, setNomePlataforma] = useState("");
  const [linkPlataforma, setLinkPlataforma] = useState("");
  const [imagemPlataforma, setImagemPlataforma] = useState("");
  const [ordemPlataforma, setOrdemPlataforma] = useState(0);
  const [isNewPlataforma, setIsNewPlataforma] = useState(false);
  const [ativoPlataforma, setAtivoPlataforma] = useState(true);
  const [plataformaEditando, setPlataformaEditando] = useState<any>(null);

  // Signals states
  const [sinais, setSinais] = useState<any[]>([]);
  const [nomeJogo, setNomeJogo] = useState("");
  const [categoriaJogo, setCategoriaJogo] = useState("PG");
  const [imagemUrl, setImagemUrl] = useState("");
  const [corBackground, setCorBackground] = useState("#1c1c1e");
  const [betsString, setBetsString] = useState("");
  const [sinalEditando, setSinalEditando] = useState<any>(null);
  const [games, setGames] = useState<GameMediaRow[]>([]);
  const [ativoSinal, setAtivoSinal] = useState(true);
  const [destaqueSinal, setDestaqueSinal] = useState(false);
  const [gameIdSinal, setGameIdSinal] = useState("");
  const [themeColorSinal, setThemeColorSinal] = useState("");
  const [cardColorSaveError, setCardColorSaveError] = useState("");

  const [buscaSinal, setBuscaSinal] = useState("");
  const [sinaisVisiveis, setSinaisVisiveis] = useState(30);
  const [providerFiltro, setProviderFiltro] = useState("Todos");
  const [ativoFiltro, setAtivoFiltro] = useState("Todos");
  const [imagemFiltro, setImagemFiltro] = useState("Todas");

  const sinaisFiltrados = sinais.filter((s) => {
    const imageInfo = getSignalImageInfo(s, games);
    return s.nome_jogo.toLowerCase().includes(buscaSinal.toLowerCase().trim())
      && (providerFiltro === "Todos" || s.categoria_jogo === providerFiltro)
      && (ativoFiltro === "Todos" || (ativoFiltro === "Ativos" ? s.ativo !== false : s.ativo === false))
      && (imagemFiltro === "Todas" || (imagemFiltro === "Pendentes" ? imageInfo.placeholder : !imageInfo.placeholder));
  });
  const sinaisExibidos = sinaisFiltrados.slice(0, sinaisVisiveis);
  const originalCardColor = normalizeLegacySignalColor(corBackground);
  const normalizedCardColorOverride = normalizeGameThemeColor(themeColorSinal);
  const resolvedCardColor = resolveGameThemeColor({
    signalColor: corBackground,
    gameThemeColor: themeColorSinal,
  });
  const hasCardColorOverride = normalizedCardColorOverride !== null;
  const cardColorValidationError = themeColorSinal && !normalizedCardColorOverride
    ? "Use exclusivamente hexadecimal no formato #RRGGBB."
    : "";
  const effectiveCardColor = resolvedCardColor || "#1C1C1E";
  const cardColorOrigin = hasCardColorOverride
    ? "Cor personalizada"
    : originalCardColor
      ? "Usando cor original"
      : "Usando cor padrão";
  const previewGame = games.find((game) => String(game.id) === gameIdSinal);
  const previewImageCandidates = buildGameImageCandidates({
    gameId: sinalEditando?.id || "preview",
    category: categoriaJogo,
    storageImageUrl: previewGame?.storage_image_url,
    storageIconUrl: previewGame?.storage_icon_url,
    rawImageUrl: imagemUrl,
  });
  const previewCardImage = previewImageCandidates[0] || GAME_IMAGE_PLACEHOLDER;
  const previewBetValues = betsString.split(",").map((value) => value.trim()).filter(Boolean);
  const previewBonus = previewBetValues[0] || "0.50";
  const previewConnection = previewBetValues[1] || previewBonus;
  const previewExtra = previewBetValues[2] || previewConnection;

  // Check user session
  useEffect(() => {
    async function checkSession() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        router.push("/admin/login");
      } else {
        setSession(currentSession);
        setLoadingSession(false);
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!currentSession) {
        router.push("/admin/login");
      } else {
        setSession(currentSession);
        setLoadingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Load database configuration, appearance, platforms, and signals
  useEffect(() => {
    async function carregarConfig() {
      // Carregar Configurações de Redes Sociais
      const { data, error } = await supabase
        .from("config_site")
        .select("*")
        .limit(1)
        .single();

      if (data) {
        const resolvedConfig = resolveSiteV2(data);
        setConfigSiteV2(asJsonObject(data.config_v2));
        setPopupLink(data.popup_link || "");
        setWhatsapp(resolvedConfig.whatsappNumber);
        setWhatsappMensagem(resolvedConfig.whatsappMessage);
        setHeaderBotaoTexto(resolvedConfig.headerButtonText);
        setCtaTitulo(resolvedConfig.ctaTitle);
        setCtaDescricao(resolvedConfig.ctaDescription);
        setCtaBotaoTexto(resolvedConfig.ctaButtonText);
        setHeaderAtivo(resolvedConfig.headerActive);
        setCtaAtivo(resolvedConfig.ctaActive);
        setSiteSections(resolvedConfig.sections);
        setSocialNav(resolvedConfig.socialNav);
      }

      if (error) {
        console.log(error);
      }

      // Carregar Aparência White-Label (Default)
      const { data: aparenciaData, error: aparenciaError } = await supabase
        .from("aparencia")
        .select("*")
        .eq("domain", "default")
        .maybeSingle();

      if (aparenciaData) {
        const resolvedAppearance = resolveAppearanceV2(aparenciaData);
        setAppearanceV2(asJsonObject(aparenciaData.config_v2));
        setNomeSite(aparenciaData.nome_site || "Slot da Sorte");
        setLogoUrl(aparenciaData.logo_url || "");
        setFaviconUrl(aparenciaData.favicon_url || "");
        setCorPrimaria(aparenciaData.cor_primaria || "#00ff66");
        setCorSecundaria(aparenciaData.cor_secundaria || "#FFC801");
        setTituloHome(aparenciaData.titulo_home || "");
        setSubtituloHome(aparenciaData.subtitulo_home || "");
        setTextoCta(aparenciaData.texto_cta || "");
        setBannerPrincipalUrl(resolvedAppearance.bannerUrl);
        setCorBotoes(resolvedAppearance.buttonColor);
        setCorFundo(resolvedAppearance.backgroundColor);
        setCorCards(resolvedAppearance.cardColor);
        setTextoRodape(resolvedAppearance.footerText);
        setBannerLink(resolvedAppearance.bannerLink);
        setBannerAtivo(resolvedAppearance.bannerActive);
      }

      if (aparenciaError) {
        console.log("Erro carregar aparencia:", aparenciaError);
      }

      // Carregar Plataformas
      const { data: plataformasData, error: plataformasError } = await supabase
        .from("plataformas")
        .select("*")
        .order("ordem", { ascending: true });

      if (plataformasData) {
        setPlataformas(plataformasData);
      }

      if (plataformasError) {
        console.log(plataformasError);
      }

      // Carregar Sinais
      const { data: sinaisData, error: sinaisError } = await supabase
        .from("sinais")
        .select("*")
        .order("id", { ascending: false });

      if (sinaisData) {
        setSinais(sinaisData);
      }

      if (sinaisError) {
        console.log(sinaisError);
      }

      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .eq("source", "rei-dos-slots")
        .order("name");

      if (gamesData) setGames(gamesData);
      if (gamesError) console.log(gamesError);

      setLastFetchTime(new Date().toLocaleTimeString("pt-BR"));
    }

    carregarConfig();
  }, []);

  // CRUD site config
  async function salvar() {
    const nextConfigV2 = mergeSiteV2(configSiteV2, {
      whatsappNumber: whatsapp,
      whatsappMessage: whatsappMensagem,
      headerButtonText: headerBotaoTexto,
      headerActive: headerAtivo,
      ctaTitle: ctaTitulo,
      ctaDescription: ctaDescricao,
      ctaButtonText: ctaBotaoTexto,
      ctaActive: ctaAtivo,
      sections: siteSections,
      socialNav,
    });
    const { data, error } = await supabase
      .from("config_site")
      .update({
        popup_link: popupLink,
        config_v2: nextConfigV2,
      })
      .eq("id", 1)
      .select();

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      alert("Erro ao salvar");
      console.log(error);
      return;
    }

    setConfigSiteV2(nextConfigV2);
    alert("Salvo!");
  }

  // CRUD appearance (white-label)
  async function salvarAparencia() {
    const nextConfigV2 = mergeAppearanceV2(appearanceV2, {
      buttonColor: corBotoes,
      backgroundColor: corFundo,
      cardColor: corCards,
      footerText: textoRodape,
      bannerUrl: bannerPrincipalUrl,
      bannerLink,
      bannerActive: bannerAtivo,
    });
    const { error } = await supabase
      .from("aparencia")
      .update({
        nome_site: nomeSite,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
        titulo_home: tituloHome,
        subtitulo_home: subtituloHome,
        texto_cta: textoCta,
        config_v2: nextConfigV2,
      })
      .eq("domain", "default");

    if (error) {
      alert("Erro ao salvar aparência");
      console.log(error);
      return;
    }

    setAppearanceV2(nextConfigV2);
    alert("Configurações de aparência salvas com sucesso!");
  }

  // Upload file to Supabase Storage and get public URL
  async function handleStorageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    bucket: string,
    setUrl: (url: string) => void,
    fieldId: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Por favor, selecione um arquivo de no máximo 2MB.");
      return;
    }

    setUploading(fieldId);

    try {
      const fileExt = file.name.split('.').pop();
      const cleanFileName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `${Date.now()}_${cleanFileName}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUrl(publicUrl);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Erro ao fazer upload para o Supabase Storage: " + (err.message || err));
    } finally {
      setUploading(null);
    }
  }

  // Render a styled drag & drop/file select component with automatic upload & preview
  const renderUploader = (
    label: string, 
    bucket: string, 
    currentUrl: string, 
    setUrl: (url: string) => void, 
    fieldId: string,
    aspectClass: string = "aspect-video"
  ) => {
    const isUploading = uploading === fieldId;
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
            {label}
          </label>
        )}
        <div className="relative group">
          {currentUrl ? (
            <div className={`relative ${aspectClass} w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center p-1.5`}>
              <img src={currentUrl} alt={label || "Uploaded preview"} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <label className="cursor-pointer bg-white text-black font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-zinc-200 transition-all">
                  Alterar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleStorageUpload(e, bucket, setUrl, fieldId)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="bg-red-600 text-white font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-red-500 transition-all cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </div>
          ) : (
            <label className={`cursor-pointer flex flex-col items-center justify-center ${aspectClass} w-full rounded-xl border border-dashed border-zinc-800 hover:border-emerald-500/40 bg-zinc-950/40 hover:bg-zinc-900/10 transition-all p-4`}>
              {isUploading ? (
                <div className="text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Subindo arquivo...</span>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <div className="text-zinc-500 text-lg mb-1">📤</div>
                  <span className="text-xs font-bold text-zinc-300">Selecionar arquivo</span>
                  <span className="block text-[9px] text-zinc-600">Limite de 2MB</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleStorageUpload(e, bucket, setUrl, fieldId)}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          )}
        </div>
      </div>
    );
  };

  // CRUD platforms
  async function adicionarPlataforma() {
    if (!nomePlataforma || !linkPlataforma || !imagemPlataforma) {
      alert("Preencha todos os campos");
      return;
    }

    const dados = {
      nome: nomePlataforma,
      link: linkPlataforma,
      imagem: imagemPlataforma,
      ativo: ativoPlataforma,
      ordem: ordemPlataforma,
      is_new: isNewPlataforma,
    };

    const { error } = plataformaEditando
      ? await supabase
          .from("plataformas")
          .update(dados)
          .eq("id", plataformaEditando.id)
      : await supabase
          .from("plataformas")
          .insert(dados);

    if (error) {
      console.log(error);
      alert("Erro ao salvar plataforma");
      return;
    }

    alert(plataformaEditando ? "Plataforma atualizada!" : "Plataforma adicionada!");

    setNomePlataforma("");
    setLinkPlataforma("");
    setImagemPlataforma("");
    setOrdemPlataforma(0);
    setIsNewPlataforma(false);
    setAtivoPlataforma(true);
    setPlataformaEditando(null);

    window.location.reload();
  }

  function editarPlataforma(p: any) {
    setPlataformaEditando(p);
    setNomePlataforma(p.nome || "");
    setLinkPlataforma(p.link || "");
    setImagemPlataforma(p.imagem || "");
    setOrdemPlataforma(p.ordem || 0);
    setIsNewPlataforma(p.is_new === true);
    setAtivoPlataforma(p.ativo !== false);

    setActiveTab("platforms");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirPlataforma(id: number) {
    const confirmar = confirm("Tem certeza que deseja excluir esta plataforma?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("plataformas")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      alert("Erro ao excluir plataforma");
      return;
    }

    alert("Plataforma excluída!");
    window.location.reload();
  }  

  async function atualizarStatusPlataforma(plataforma: Plataforma) {
    const ativo = plataforma.ativo === false;
    const { error } = await supabase.from("plataformas").update({ ativo }).eq("id", plataforma.id);
    if (error) return alert("Erro ao atualizar status da plataforma");
    setPlataformas((current) => current.map((item) => item.id === plataforma.id ? { ...item, ativo } : item));
  }

  async function moverPlataforma(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= plataformas.length) return;
    const current = plataformas[index];
    const target = plataformas[targetIndex];
    const currentOrder = Number(current.ordem ?? index);
    const targetOrder = Number(target.ordem ?? targetIndex);
    const [{ error: currentError }, { error: targetError }] = await Promise.all([
      supabase.from("plataformas").update({ ordem: targetOrder }).eq("id", current.id),
      supabase.from("plataformas").update({ ordem: currentOrder }).eq("id", target.id),
    ]);
    if (currentError || targetError) return alert("Erro ao reordenar plataformas");
    const reordered = [...plataformas];
    reordered[index] = { ...target, ordem: currentOrder };
    reordered[targetIndex] = { ...current, ordem: targetOrder };
    setPlataformas(reordered);
  }

  // CRUD signals
  async function adicionarSinal() {
    if (!nomeJogo || !categoriaJogo || !imagemUrl) {
      alert("Preencha todos os campos obrigatórios: Nome do jogo, Categoria e URL da imagem");
      return;
    }

    const betsArray = betsString
      ? betsString.split(",").map((b) => b.trim()).filter(Boolean)
      : [];

    const normalizedThemeColor = themeColorSinal ? normalizeGameThemeColor(themeColorSinal) : null;
    if (themeColorSinal && !normalizedThemeColor) {
      setCardColorSaveError("Corrija a cor do card antes de salvar.");
      return;
    }
    setCardColorSaveError("");

    const dados = {
      nome_jogo: nomeJogo,
      categoria_jogo: categoriaJogo,
      imagem_url: imagemUrl,
      cor_background: corBackground || "#1c1c1e",
      bets: betsArray,
      ativo: ativoSinal,
      destaque: destaqueSinal,
      game_id: gameIdSinal ? Number(gameIdSinal) : null,
    };

    const { error } = sinalEditando
      ? await supabase
          .from("sinais")
          .update(dados)
          .eq("id", sinalEditando.id)
      : await supabase
          .from("sinais")
          .insert(dados);

    if (error) {
      console.log(error);
      alert("Erro ao salvar sinal");
      return;
    }

    if (gameIdSinal) {
      const gameId = Number(gameIdSinal);
      const { error: themeColorError } = await supabase
        .from("games")
        .update({ theme_color: normalizedThemeColor })
        .eq("id", gameId);
      if (themeColorError) {
        console.log(themeColorError);
        setCardColorSaveError("O sinal foi salvo, mas não foi possível salvar a cor personalizada do jogo.");
        return;
      }
      setGames((current) => current.map((game) => Number(game.id) === gameId ? { ...game, theme_color: normalizedThemeColor } : game));
    }

    alert(sinalEditando ? "Sinal atualizado!" : "Sinal adicionado!");

    setNomeJogo("");
    setCategoriaJogo("PG");
    setImagemUrl("");
    setCorBackground("#1c1c1e");
    setBetsString("");
    setAtivoSinal(true);
    setDestaqueSinal(false);
    setGameIdSinal("");
    setThemeColorSinal("");
    setCardColorSaveError("");
    setSinalEditando(null);

    window.location.reload();
  }

  function editarSinal(s: any) {
    const associatedGame = findAssociatedGame(s, games);
    setSinalEditando(s);
    setNomeJogo(s.nome_jogo || "");
    setCategoriaJogo(s.categoria_jogo || "PG");
    setImagemUrl(s.imagem_url || "");
    setCorBackground(s.cor_background || "#1c1c1e");
    setBetsString(s.bets ? s.bets.join(", ") : "");
    setAtivoSinal(s.ativo !== false);
    setDestaqueSinal(s.destaque === true);
    setGameIdSinal(String(associatedGame?.id || ""));
    setThemeColorSinal(associatedGame?.theme_color || "");
    setCardColorSaveError("");

    setActiveTab("signals");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function excluirSinal(id: number) {
    const confirmar = confirm("Tem certeza que deseja excluir este sinal?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("sinais")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      alert("Erro ao excluir sinal");
      return;
    }

    alert("Sinal excluído!");
    window.location.reload();
  }

  async function atualizarStatusSinal(sinal: SinalRow) {
    const ativo = sinal.ativo === false;
    const { error } = await supabase.from("sinais").update({ ativo }).eq("id", sinal.id);
    if (error) return alert("Erro ao atualizar status do sinal");
    setSinais((current) => current.map((item) => item.id === sinal.id ? { ...item, ativo } : item));
  }

  function atualizarItemSocial(id: SocialNavId, changes: Partial<SocialNavItemConfig>) {
    setSocialNav((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function selecionarGameSinal(value: string) {
    setGameIdSinal(value);
    const game = games.find((item) => String(item.id) === value);
    setThemeColorSinal(game?.theme_color || "");
    setCardColorSaveError("");
  }

  function atualizarSecao(id: SiteSectionConfig["id"], changes: Partial<SiteSectionConfig>) {
    setSiteSections((current) => current.map((section) => section.id === id ? { ...section, ...changes } : section));
  }

  function moverSecao(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= siteSections.length) return;
    const reordered = [...siteSections];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setSiteSections(reordered.map((section, ordem) => ({ ...section, ordem })));
  }

  // Session verification loader
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-md animate-pulse"></div>
          </div>
          <p className="text-zinc-500 font-black text-xs tracking-wider uppercase">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Visão Geral", icon: FiGrid },
    { id: "platforms", label: "Plataformas", icon: FiLayers },
    { id: "signals", label: "Sinais de Slots", icon: FiPlayCircle },
    { id: "config", label: "Redes Sociais", icon: FiSettings },
    { id: "appearance", label: "Aparência", icon: FiGlobe },
    { id: "sections", label: "Seções do site", icon: FiGrid },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-955 text-zinc-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-900">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-green-500 to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.35)]">
          <span className="text-black font-black text-xl tracking-tighter">S</span>
        </div>
        <div>
          <h1 className="font-black tracking-tighter text-md text-white truncate max-w-[150px]">
            {nomeSite || "SLOT DA SORTE"}
          </h1>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Admin Panel</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
          Menu Principal
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/50">
        <div className="flex items-center gap-3 px-2 py-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 text-xs uppercase border border-zinc-700">
            {session?.user?.email ? session.user.email.charAt(0) : "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-300 truncate">{session?.user?.email || "Administrador"}</p>
            <p className="text-[10px] text-zinc-505 truncate">Ativo</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/admin/login");
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all uppercase tracking-wider cursor-pointer"
        >
          <FiLogOut className="w-3.5 h-3.5" />
          Sair do Painel
        </button>
      </div>
    </div>
  );

  const overviewCards = [
    {
      title: "Total de Plataformas",
      value: plataformas.length,
      subtitle: "Cadastradas no banco",
      icon: FiLayers,
      glowColor: "from-emerald-500/20 to-transparent",
      iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    },
    {
      title: "Total de Sinais",
      value: sinais.length,
      subtitle: "Jogos cadastrados",
      icon: FiPlayCircle,
      glowColor: "from-amber-500/15 to-transparent",
      iconBg: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    },
    {
      title: "Última Atualização",
      value: lastFetchTime || "--:--:--",
      subtitle: "Tempo de sincronização",
      icon: FiRefreshCw,
      glowColor: "from-blue-500/20 to-transparent",
      iconBg: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    },
    {
      title: "Status do Sistema",
      value: "Online",
      subtitle: "Supabase operacional",
      icon: FiCpu,
      glowColor: "from-green-500/20 to-transparent",
      iconBg: "bg-green-500/10 text-green-400 border border-green-500/20",
      isStatus: true,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex font-sans antialiased overflow-x-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-right {
          animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 9999px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>

      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-zinc-950 border-r border-zinc-900 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-64 h-full bg-zinc-950 border-r border-zinc-900 shadow-2xl animate-slide-right z-10">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute right-4 top-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
            >
              <FiX className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-zinc-900 h-16 flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg cursor-pointer"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <h2 className="text-sm md:text-base font-bold text-white capitalize">
              {activeTab === "overview" && "Visão Geral"}
              {activeTab === "platforms" && "Gerenciar Plataformas"}
              {activeTab === "signals" && "Sinais de Slots"}
              {activeTab === "config" && "Redes Sociais"}
              {activeTab === "appearance" && "Aparência & Identidade"}
              {activeTab === "sections" && "Seções do site"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/85 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-zinc-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Supabase Ativo
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/admin/login");
              }}
              className="md:hidden p-2 text-red-400 hover:text-red-350 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all"
              title="Sair"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-fade-in">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {overviewCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div 
                      key={idx}
                      className="relative overflow-hidden bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:border-zinc-700/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)] group"
                    >
                      <div className={`absolute -right-10 -bottom-10 w-24 h-24 rounded-full bg-gradient-to-br ${card.glowColor} blur-2xl group-hover:scale-125 transition-transform duration-500`} />
                      
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-zinc-505 uppercase tracking-wider">{card.title}</p>
                          <div className="flex items-center gap-2">
                            <h3 className="text-3xl font-black tracking-tight text-white">{card.value}</h3>
                            {card.isStatus && (
                              <span className="relative flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">{card.subtitle}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${card.iconBg}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="bg-zinc-900/10 border border-zinc-900 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm">Ações Rápidas</h4>
                  <p className="text-xs text-zinc-550">Escolha o que deseja fazer ou gerenciar a seguir.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setActiveTab("platforms")}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    <FiPlus className="w-4 h-4" /> Plataforma
                  </button>
                  <button 
                    onClick={() => setActiveTab("signals")}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-amber-300 transition-all cursor-pointer"
                  >
                    <FiPlus className="w-4 h-4" /> Sinal de Slot
                  </button>
                  <button 
                    onClick={() => setActiveTab("appearance")}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    <FiGlobe className="w-4 h-4" /> Customizar Marca
                  </button>
                </div>
              </div>

              {/* Grid of lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Platforms Summary */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <FiLayers className="text-emerald-400" /> Plataformas Recentes
                    </h3>
                    <button 
                      onClick={() => setActiveTab("platforms")}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Gerenciar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {plataformas.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 hover:bg-zinc-900/20 transition-all">
                        <img src={p.imagem} alt={p.nome} onError={(e) => { e.currentTarget.src = "/placeholder.webp"; }} className="w-10 h-10 rounded-lg object-cover bg-black" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-zinc-200 truncate">{p.nome}</h4>
                          <p className="text-xs text-zinc-500 truncate">{p.link}</p>
                        </div>
                        <span className="px-2.5 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ativo
                        </span>
                      </div>
                    ))}
                    {plataformas.length === 0 && (
                      <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma plataforma cadastrada.</p>
                    )}
                  </div>
                </div>

                {/* Recent Signals Summary */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <FiPlayCircle className="text-amber-400" /> Sinais Recentes
                    </h3>
                    <button 
                      onClick={() => setActiveTab("signals")}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Gerenciar
                    </button>
                  </div>
                  <div className="space-y-3">
                    {sinais.slice(0, 3).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 bg-zinc-955/40 border border-zinc-900 rounded-xl p-3 hover:bg-zinc-900/20 transition-all">
                        <img 
                          src={
                            s.imagem_url.startsWith("http") || s.imagem_url.startsWith("/")
                              ? s.imagem_url
                              : `https://reidoslotsinais.bet/images/games/${s.imagem_url}.webp`
                          }
                          alt={s.nome_jogo}
                          onError={(e) => { e.currentTarget.src = "/placeholder.webp"; }}
                          className="w-10 h-10 rounded-lg object-cover bg-black"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-zinc-200 truncate">{s.nome_jogo}</h4>
                          <p className="text-xs text-zinc-500 truncate">Categoria: {s.categoria_jogo}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded ${
                          s.categoria_jogo === "PG" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          s.categoria_jogo === "PP" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        }`}>
                          {s.categoria_jogo}
                        </span>
                      </div>
                    ))}
                    {sinais.length === 0 && (
                      <p className="text-xs text-zinc-550 py-6 text-center">Nenhum sinal cadastrado.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATAFORMAS */}
          {activeTab === "platforms" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
              {/* Form Col */}
              <div className="xl:col-span-1 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 self-start">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <FiPlus className={plataformaEditando ? "text-amber-400 animate-pulse" : "text-emerald-400"} />
                    {plataformaEditando ? "Editar Plataforma" : "Nova Plataforma"}
                  </h3>
                  {plataformaEditando && (
                    <button
                      onClick={() => {
                        setPlataformaEditando(null);
                        setNomePlataforma("");
                        setLinkPlataforma("");
                        setImagemPlataforma("");
                        setOrdemPlataforma(0);
                        setIsNewPlataforma(false);
                        setAtivoPlataforma(true);
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-355 uppercase transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Nome da Plataforma
                    </label>
                    <input
                      value={nomePlataforma}
                      onChange={(e) => setNomePlataforma(e.target.value)}
                      placeholder="ex: Bet365"
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-505">
                      Link de Afiliação
                    </label>
                    <input
                      value={linkPlataforma}
                      onChange={(e) => setLinkPlataforma(e.target.value)}
                      placeholder="ex: https://afiliado.com/..."
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  {renderUploader(
                    "Logomarca da Plataforma",
                    "plataformas",
                    imagemPlataforma,
                    setImagemPlataforma,
                    "plataforma",
                    "aspect-square"
                  )}

                  {imagemPlataforma && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">Preview do card</p>
                      <div className="relative mx-auto aspect-square max-w-40 overflow-hidden rounded-2xl border border-white/10">
                        <img src={imagemPlataforma} alt="Preview da plataforma" className="h-full w-full object-cover" />
                        {isNewPlataforma && <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black text-black">NOVA</span>}
                      </div>
                      <p className="mt-2 truncate text-center text-xs font-bold text-white">{nomePlataforma || "Nome da plataforma"}</p>
                    </div>
                  )}

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-505">
                      Ordem de Exibição
                    </label>
                    <input
                      type="number"
                      value={ordemPlataforma}
                      onChange={(e) => setOrdemPlataforma(Number(e.target.value))}
                      placeholder="0"
                      className="w-full h-11 rounded-xl bg-zinc-955/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <ToggleField label="Marcar como nova" checked={isNewPlataforma} onChange={setIsNewPlataforma} />
                    <ToggleField label="Plataforma ativa" checked={ativoPlataforma} onChange={setAtivoPlataforma} />
                  </div>

                  <button
                    onClick={adicionarPlataforma}
                    className={`w-full h-11 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer ${
                      plataformaEditando
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400"
                        : "bg-gradient-to-r from-emerald-500 to-green-500 text-black hover:from-emerald-400 hover:to-green-400"
                    }`}
                  >
                    {plataformaEditando ? "Salvar Alterações" : "Adicionar Plataforma"}
                  </button>
                </div>
              </div>

              {/* Table Col */}
              <div className="xl:col-span-2 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 flex flex-col overflow-hidden">
                <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                  <FiLayers className="text-emerald-400" /> Plataformas Ativas ({plataformas.length})
                </h3>

                <div className="overflow-x-auto max-h-[600px] border border-zinc-800/60 rounded-xl scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-850">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-20">Imagem</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400">Nome</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 hidden md:table-cell">Link</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-24">Ordem</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-24">Status</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-40 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {plataformas.map((p, index) => (
                        <tr key={p.id} className="hover:bg-zinc-900/30 transition-all duration-150">
                          <td className="px-5 py-4">
                            <img
                              src={p.imagem}
                              alt={p.nome}
                              onError={(e) => { e.currentTarget.src = "/placeholder.webp"; }}
                              className="w-10 h-10 rounded-xl object-cover bg-black border border-zinc-855 shadow-md"
                            />
                          </td>
                          <td className="px-5 py-4 font-bold text-sm text-white">{p.nome}</td>
                          <td className="px-5 py-4 text-xs text-zinc-500 max-w-xs truncate hidden md:table-cell">
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                              {p.link}
                            </a>
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-405 font-mono font-bold">{p.ordem}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full border ${p.ativo === false ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${p.ativo === false ? "bg-zinc-500" : "bg-emerald-500 animate-pulse"}`}></span>
                              {p.ativo === false ? "Inativa" : "Ativa"}{p.is_new ? " · Nova" : ""}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => moverPlataforma(index, -1)} disabled={index === 0} aria-label={`Subir ${p.nome}`} className="rounded-lg border border-zinc-700 p-1.5 text-zinc-300 disabled:opacity-30"><FiArrowUp className="h-3 w-3" /></button>
                              <button onClick={() => moverPlataforma(index, 1)} disabled={index === plataformas.length - 1} aria-label={`Descer ${p.nome}`} className="rounded-lg border border-zinc-700 p-1.5 text-zinc-300 disabled:opacity-30"><FiArrowDown className="h-3 w-3" /></button>
                              <button onClick={() => atualizarStatusPlataforma(p)} className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-1.5 text-blue-400" aria-label={`${p.ativo === false ? "Ativar" : "Desativar"} ${p.nome}`}><FiEye className="h-3 w-3" /></button>
                              <button
                                onClick={() => editarPlataforma(p)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/5 hover:bg-amber-400/15 border border-amber-400/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <FiEdit className="w-3 h-3" />
                                Editar
                              </button>
                              <button
                                onClick={() => excluirPlataforma(p.id)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/5 hover:bg-red-400/15 border border-red-400/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <FiTrash2 className="w-3 h-3" />
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {plataformas.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs text-zinc-500">
                            Nenhuma plataforma cadastrada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SINAIS */}
          {activeTab === "signals" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
              {/* Form Col */}
              <div className="xl:col-span-1 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 self-start">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <FiPlus className={sinalEditando ? "text-amber-400 animate-pulse" : "text-emerald-400"} />
                    {sinalEditando ? "Editar Sinal" : "Novo Sinal"}
                  </h3>
                  {sinalEditando && (
                    <button
                      onClick={() => {
                        setSinalEditando(null);
                        setNomeJogo("");
                        setCategoriaJogo("PG");
                        setImagemUrl("");
                        setCorBackground("#1c1c1e");
                        setBetsString("");
                        setAtivoSinal(true);
                        setDestaqueSinal(false);
                        setGameIdSinal("");
                        setThemeColorSinal("");
                        setCardColorSaveError("");
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-350 uppercase transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-505">
                      Nome do Jogo
                    </label>
                    <input
                      value={nomeJogo}
                      onChange={(e) => setNomeJogo(e.target.value)}
                      placeholder="ex: Fortune Tiger"
                      className="w-full h-11 rounded-xl bg-zinc-955/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Associação técnica com public.games</label>
                    <select value={gameIdSinal} onChange={(event) => selecionarGameSinal(event.target.value)} className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none">
                      <option value="">Sem associação</option>
                      {games.filter((game) => game.provider_normalized === normalizeAdminProvider(categoriaJogo)).map((game) => <option key={game.id} value={game.id}>{game.name} · #{game.external_id}</option>)}
                    </select>
                    <p className="mt-1 text-[10px] text-zinc-600">Somente jogos do mesmo provider são exibidos.</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Cor do card</label>
                            <p className="mt-1 text-[10px] text-zinc-600">A personalização é salva em games.theme_color; sinais.cor_background continua sendo a cor original.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setThemeColorSinal("");
                              setCardColorSaveError("");
                            }}
                            disabled={!gameIdSinal || !themeColorSinal}
                            className="shrink-0 text-[10px] font-black uppercase text-emerald-400 disabled:text-zinc-700"
                          >
                            Usar cor original
                          </button>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-black/20 p-3" aria-live="polite">
                          <span className="h-9 w-9 shrink-0 rounded-lg border border-white/20 shadow-sm" style={{ backgroundColor: effectiveCardColor }} aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-zinc-300">{cardColorOrigin}</p>
                            <p className="mt-0.5 font-mono text-xs text-white">{effectiveCardColor}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="color"
                            aria-label="Selecionar cor do card"
                            value={effectiveCardColor}
                            onChange={(event) => {
                              setThemeColorSinal(event.target.value.toUpperCase());
                              setCardColorSaveError("");
                            }}
                            disabled={!gameIdSinal}
                            className="h-11 w-12 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950 p-1 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                          <input
                            aria-label="Cor hexadecimal do card"
                            value={themeColorSinal}
                            onChange={(event) => {
                              setThemeColorSinal(event.target.value.toUpperCase());
                              setCardColorSaveError("");
                            }}
                            onBlur={() => {
                              const normalized = normalizeGameThemeColor(themeColorSinal);
                              if (normalized) setThemeColorSinal(normalized);
                            }}
                            disabled={!gameIdSinal}
                            maxLength={7}
                            placeholder={originalCardColor || "#RRGGBB"}
                            aria-invalid={Boolean(cardColorValidationError)}
                            aria-describedby="card-color-feedback"
                            className={`h-11 min-w-0 flex-1 rounded-xl border bg-zinc-950/80 px-4 font-mono text-sm text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${cardColorValidationError ? "border-red-500/70" : "border-zinc-800 focus:border-emerald-500/50"}`}
                          />
                        </div>
                        <p id="card-color-feedback" className={`min-h-4 text-[10px] font-bold ${cardColorValidationError || cardColorSaveError ? "text-red-400" : "text-zinc-600"}`}>
                          {cardColorValidationError || cardColorSaveError || "Formato aceito: #RRGGBB."}
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-[9px] font-black uppercase tracking-[.14em] text-zinc-500">Preview do card</p>
                        <article className="signal-card mx-auto w-full max-w-[320px]" data-themed="true" style={getGameThemeStyle(effectiveCardColor)}>
                          <div className="flex flex-col p-2.5 sm:p-3">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element -- o preview precisa aceitar a mesma URL dinâmica do card público */}
                              <img
                                src={previewCardImage}
                                alt={nomeJogo ? `Preview de ${nomeJogo}` : "Preview do jogo"}
                                className="h-full w-full object-cover"
                                onError={(event) => applyGameImageFallback(event.currentTarget, previewImageCandidates)}
                              />
                              <div className="game-image-detail absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-7">
                                <span className="text-[9px] font-bold uppercase tracking-wide text-white/85">{categoriaJogo || "Provider"}</span>
                              </div>
                            </div>
                            <h3 className="game-card-title mt-2.5 font-black text-white">{nomeJogo || "Nome do jogo"}</h3>
                            <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-[var(--tenant-muted)]">{categoriaJogo || "Provider"}</p>
                            <div className="game-bet-suggestions mt-3 rounded-xl border border-white/8 bg-black/20 p-2">
                              <p className="mb-1.5 text-[8px] font-black uppercase tracking-[.12em] text-[var(--tenant-muted)]">Sugestões de aposta</p>
                              <div className="grid grid-cols-3 gap-1 text-center text-[8px]">
                                {[["Bônus", previewBonus], ["Conexão", previewConnection], ["Extra", previewExtra]].map(([label, value]) => (
                                  <div key={label} className="min-w-0 rounded-md bg-white/5 px-0.5 py-1.5">
                                    <span className="block truncate text-white/50">{label}</span>
                                    <strong className="mt-0.5 block truncate text-white">{value}</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <span className="game-access-button signal-button mt-2.5 w-full px-1 py-2 text-[10px]">Acessar</span>
                          </div>
                        </article>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-505">
                      Categoria do Jogo
                    </label>
                    <select
                      value={categoriaJogo}
                      onChange={(e) => {
                        setCategoriaJogo(e.target.value);
                        setGameIdSinal("");
                        setThemeColorSinal("");
                        setCardColorSaveError("");
                      }}
                      className="w-full h-11 rounded-xl bg-zinc-955/80 border border-zinc-800 px-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    >
                      <option value="PG">PG Games</option>
                      <option value="PP">PP Games</option>
                      <option value="WG">WG Games</option>
                    </select>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <ToggleField label="Sinal ativo" checked={ativoSinal} onChange={setAtivoSinal} />
                    <ToggleField label="Destacar nas maiores distribuições" checked={destaqueSinal} onChange={setDestaqueSinal} />
                  </div>

                  {renderUploader(
                    "Imagem do Jogo",
                    "jogos",
                    imagemUrl,
                    setImagemUrl,
                    "sinal",
                    "aspect-[4/3]"
                  )}

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-505">
                      Cor de Fundo (Hex)
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={corBackground}
                        onChange={(e) => setCorBackground(e.target.value)}
                        placeholder="ex: #1c1c1e"
                        className="flex-1 h-11 rounded-xl bg-zinc-955/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-605 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all font-mono"
                      />
                      <div 
                        className="w-11 h-11 rounded-xl border border-zinc-800 shadow-md"
                        style={{ backgroundColor: corBackground || "#1c1c1e" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-550">
                      Valores de Apostas (Separados por vírgula)
                    </label>
                    <textarea
                      value={betsString}
                      onChange={(e) => setBetsString(e.target.value)}
                      placeholder="ex: 0.50, 1.20, 2.40, 5.00"
                      className="w-full h-20 rounded-xl bg-zinc-955/80 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-605 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all resize-none font-mono"
                    />
                  </div>

                  <button
                    onClick={adicionarSinal}
                    className={`w-full h-11 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer ${
                      sinalEditando
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400"
                        : "bg-gradient-to-r from-emerald-500 to-green-500 text-black hover:from-emerald-400 hover:to-green-400"
                    }`}
                  >
                    {sinalEditando ? "Salvar Alterações" : "Adicionar Sinal"}
                  </button>
                </div>
              </div>

              {/* Table Col */}
              <div className="xl:col-span-2 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 flex flex-col space-y-4 overflow-hidden">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <FiPlayCircle className="text-emerald-400" /> Lista de Sinais ({sinaisFiltrados.length})
                  </h3>

                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                    <input
                      value={buscaSinal}
                      onChange={(e) => {
                        setBuscaSinal(e.target.value);
                        setSinaisVisiveis(30);
                      }}
                      placeholder="Buscar jogo..."
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:outline-none transition-all"
                    />
                  </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <select value={providerFiltro} onChange={(event) => { setProviderFiltro(event.target.value); setSinaisVisiveis(30); }} className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white"><option>Todos</option><option value="PG">PG</option><option value="PP">PP</option><option value="TADA">TADA</option><option value="WG">WG</option></select>
                    <select value={ativoFiltro} onChange={(event) => { setAtivoFiltro(event.target.value); setSinaisVisiveis(30); }} className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white"><option>Todos</option><option>Ativos</option><option>Inativos</option></select>
                    <select value={imagemFiltro} onChange={(event) => { setImagemFiltro(event.target.value); setSinaisVisiveis(30); }} className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white"><option>Todas</option><option>Pendentes</option><option>Válidas</option></select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[600px] border border-zinc-800/60 rounded-xl scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-855">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-20">Jogo</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400">Nome</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-32">Categoria</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 hidden md:table-cell">Sugestões de Bet</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-40 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {sinaisExibidos.map((s) => {
                        const imageInfo = getSignalImageInfo(s, games);
                        return (
                        <tr key={s.id} className="hover:bg-zinc-900/30 transition-all duration-150">
                          <td className="px-5 py-4">
                            <img
                              src={imageInfo.src}
                              alt={s.nome_jogo}
                              onError={(e) => {
                                if (e.currentTarget.dataset.fallbackApplied === "true") return;
                                e.currentTarget.dataset.fallbackApplied = "true";
                                e.currentTarget.src = GAME_IMAGE_PLACEHOLDER;
                              }}
                              className="w-10 h-10 rounded-xl object-cover bg-black border border-zinc-850"
                            />
                            <span className={`mt-1 inline-flex text-[8px] font-black uppercase ${imageInfo.placeholder ? "text-amber-400" : "text-emerald-400"}`}><FiImage className="mr-1" />{imageInfo.placeholder ? "Placeholder" : "Válida"}</span>
                          </td>
                          <td className="px-5 py-4 font-bold text-sm text-white"><div className="flex items-center gap-1">{s.nome_jogo}{s.destaque && <FiStar className="text-amber-400" />}</div><p className="mt-1 text-[9px] font-normal text-zinc-500">{imageInfo.game ? `games #${imageInfo.game.id} · ${imageInfo.game.name}` : "Sem associação em public.games"}</p><button onClick={() => atualizarStatusSinal(s)} className={`mt-1 text-[9px] font-black uppercase ${s.ativo === false ? "text-zinc-500" : "text-emerald-400"}`}>{s.ativo === false ? "Inativo · ativar" : "Ativo · desativar"}</button></td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full border ${
                              s.categoria_jogo === "PG" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              s.categoria_jogo === "PP" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            }`}>
                              {s.categoria_jogo} Games
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-zinc-400 hidden md:table-cell">
                            {s.bets && s.bets.length > 0 ? (
                              <div className="flex gap-1.5 flex-wrap">
                                {s.bets.slice(0, 3).map((b: string, i: number) => (
                                  <span key={i} className="bg-zinc-955 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-855 font-mono text-[10px]">
                                    {b}
                                  </span>
                                ))}
                                {s.bets.length > 3 && (
                                  <span className="text-zinc-650 text-[10px] self-center">
                                    +{s.bets.length - 3} mais
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-600 font-normal italic">Nenhuma configurada</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => editarSinal(s)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/5 hover:bg-amber-400/15 border border-amber-400/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <FiEdit className="w-3 h-3" />
                                Editar
                              </button>
                              <button
                                onClick={() => excluirSinal(s.id)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/5 hover:bg-red-400/15 border border-red-400/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <FiTrash2 className="w-3 h-3" />
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );})}
                      {sinaisFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-xs text-zinc-500">
                            Nenhum sinal encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginação Carregar Mais */}
                {sinaisFiltrados.length > sinaisVisiveis && (
                  <button
                    onClick={() => setSinaisVisiveis((prev) => prev + 30)}
                    className="w-full h-11 rounded-xl bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 transition-all font-bold text-xs uppercase text-zinc-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    Carregar Mais ({sinaisFiltrados.length - sinaisVisiveis} restantes)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURAÇÕES REDES SOCIAIS */}
          {activeTab === "config" && (
            <div className="max-w-2xl bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FiSettings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider">Redes Sociais & Contatos</h3>
                  <p className="text-xs text-zinc-500">Ajuste os links de redes sociais e popup promocional.</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* WhatsApp */}
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FiMessageSquare className="text-green-400" /> Link do WhatsApp
                  </label>
                  <div className="relative">
                    <FiMessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4.5 h-4.5" />
                    <input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="ex: https://chat.whatsapp.com/..."
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Mensagem padrão do WhatsApp</label>
                  <textarea value={whatsappMensagem} onChange={(event) => setWhatsappMensagem(event.target.value)} placeholder="Mensagem preenchida ao abrir a conversa" className="h-20 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Texto do botão do header</label><input value={headerBotaoTexto} onChange={(event) => setHeaderBotaoTexto(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none" /></div>
                  <div><label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Texto do botão do CTA</label><input value={ctaBotaoTexto} onChange={(event) => setCtaBotaoTexto(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none" /></div>
                </div>

                <div><label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Título do CTA inferior</label><input value={ctaTitulo} onChange={(event) => setCtaTitulo(event.target.value)} className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none" /></div>
                <div><label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Descrição do CTA inferior</label><textarea value={ctaDescricao} onChange={(event) => setCtaDescricao(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none" /></div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleField label="Exibir botão no header" checked={headerAtivo} onChange={setHeaderAtivo} />
                  <ToggleField label="Exibir CTA inferior" checked={ctaAtivo} onChange={setCtaAtivo} />
                </div>

                <div className="space-y-3 border-t border-zinc-900 pt-5">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Redes sociais do header</h4>
                    <p className="mt-1 text-[10px] text-zinc-500">Instagram, Telegram e TikTok aparecem de forma discreta antes do WhatsApp.</p>
                  </div>
                  {EDITABLE_SOCIAL_IDS.map((id) => {
                    const item = socialNav.find((socialItem) => socialItem.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                        <div>
                          <div>
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Label</label>
                            <input value={item.label} onChange={(event) => atualizarItemSocial(id, { label: event.target.value })} className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">URL</label>
                          <input type="url" value={item.url} onChange={(event) => atualizarItemSocial(id, { url: event.target.value })} placeholder="https://..." className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-700 focus:border-emerald-500/50 focus:outline-none" />
                        </div>
                        <div>
                          <ToggleField label="Ativo" checked={item.enabled} onChange={(enabled) => atualizarItemSocial(id, { enabled })} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="rounded-xl border border-zinc-800 bg-[#050806] p-3 [--tenant-primary:#16A34A] [--tenant-surface:#101512]">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">Preview</p>
                    <div className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/75 px-3">
                      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[9px] font-black">LOGO</span><strong className="hidden text-xs text-white sm:block">Marca</strong></div>
                      <div className="header-actions"><HeaderSocialLinks items={socialNav} preview /><span className="header-whatsapp signal-button px-3 py-2 text-[10px]">WhatsApp</span></div>
                    </div>
                  </div>
                </div>

                {/* Popup Link */}
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FiGlobe className="text-amber-400" /> Link do Popup Promocional
                  </label>
                  <div className="relative">
                    <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-550 w-4.5 h-4.5" />
                    <input
                      value={popupLink}
                      onChange={(e) => setPopupLink(e.target.value)}
                      placeholder="ex: https://google.com"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-zinc-955/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={salvar}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-bold text-sm uppercase tracking-wider transition-all duration-300 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-6"
                >
                  <FiCheck className="w-5 h-5" />
                  Salvar Configurações
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: APARÊNCIA & BRANDING */}
          {activeTab === "appearance" && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FiGlobe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider">Aparência & Identidade Visual</h3>
                  <p className="text-xs text-zinc-500">Personalize as cores, textos, logotipos e banners da plataforma para adequar à sua marca.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Branding Identidade Visual Card */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                  <h4 className="font-bold text-white text-sm border-b border-zinc-900 pb-2">Identidade Visual da Marca</h4>

                  {/* Nome do site */}
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Nome do Site / Marca
                    </label>
                    <input
                      value={nomeSite}
                      onChange={(e) => setNomeSite(e.target.value)}
                      placeholder="ex: Slot da Sorte"
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Cores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Cor Primária
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={corPrimaria}
                          onChange={(e) => setCorPrimaria(e.target.value)}
                          className="w-11 h-11 rounded-xl bg-zinc-955 border border-zinc-800 cursor-pointer p-1"
                        />
                        <input
                          type="text"
                          value={corPrimaria}
                          onChange={(e) => setCorPrimaria(e.target.value)}
                          className="flex-1 h-11 rounded-xl bg-zinc-955/80 border border-zinc-800 px-3 text-xs text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Cor de destaque
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={corSecundaria}
                          onChange={(e) => setCorSecundaria(e.target.value)}
                          className="w-11 h-11 rounded-xl bg-zinc-955 border border-zinc-800 cursor-pointer p-1"
                        />
                        <input
                          type="text"
                          value={corSecundaria}
                          onChange={(e) => setCorSecundaria(e.target.value)}
                          className="flex-1 h-11 rounded-xl bg-zinc-955/80 border border-zinc-800 px-3 text-xs text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      ["Cor dos botões", corBotoes, setCorBotoes],
                      ["Fundo", corFundo, setCorFundo],
                      ["Cards", corCards, setCorCards],
                    ].map(([label, value, setter]) => (
                      <div key={label as string}>
                        <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">{label as string}</label>
                        <div className="flex gap-2"><input type="color" value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="h-11 w-11 rounded-xl border border-zinc-800 bg-zinc-950 p-1" /><input value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-2 text-xs text-white" /></div>
                      </div>
                    ))}
                  </div>

                  {renderUploader(
                    "Logomarca da Marca (Upload)",
                    "logos",
                    logoUrl,
                    setLogoUrl,
                    "logo",
                    "aspect-[3/1]"
                  )}

                  {renderUploader(
                    "Favicon do Navegador (Upload)",
                    "logos",
                    faviconUrl,
                    setFaviconUrl,
                    "favicon",
                    "aspect-square w-24 h-24 mx-auto"
                  )}
                </div>

                {/* Homepage Layout settings */}
                <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                  <h4 className="font-bold text-white text-sm border-b border-zinc-900 pb-2">Conteúdo de Exibição na Homepage</h4>

                  {/* Título Home */}
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Título Principal da Homepage
                    </label>
                    <input
                      value={tituloHome}
                      onChange={(e) => setTituloHome(e.target.value)}
                      placeholder="ex: SINAIS DE SLOT EM TEMPO REAL"
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Subtítulo Home */}
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Subtítulo / Descrição da Home
                    </label>
                    <textarea
                      value={subtituloHome}
                      onChange={(e) => setSubtituloHome(e.target.value)}
                      placeholder="Descrição sutil para colocar abaixo da logo e no rodapé."
                      className="w-full h-20 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Texto CTA */}
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Texto do Botão CTA (Ação)
                    </label>
                    <input
                      value={textoCta}
                      onChange={(e) => setTextoCta(e.target.value)}
                      placeholder="ex: Acessar Plataforma"
                      className="w-full h-11 rounded-xl bg-zinc-955/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  {renderUploader(
                    "Banner / Imagem Principal (Upload)",
                    "banners",
                    bannerPrincipalUrl,
                    setBannerPrincipalUrl,
                    "banner",
                    "aspect-[16/9]"
                  )}

                  <div><label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">Link do banner</label><input value={bannerLink} onChange={(event) => setBannerLink(event.target.value)} placeholder="https://..." className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 text-sm text-white focus:border-emerald-500/50 focus:outline-none" /></div>
                  <ToggleField label="Exibir banner principal" checked={bannerAtivo} onChange={setBannerAtivo} />
                  <div><label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">Texto do rodapé</label><textarea value={textoRodape} onChange={(event) => setTextoRodape(event.target.value)} className="h-20 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none" /></div>
                </div>
              </div>

              {/* Botão Salvar Geral */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={salvarAparencia}
                  className="w-full sm:w-auto px-8 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiCheck className="w-5 h-5" />
                  Salvar Alterações de Aparência
                </button>
              </div>
            </div>
          )}

          {activeTab === "sections" && (
            <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-zinc-900 pb-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400"><FiGrid className="h-5 w-5" /></div><div><h3 className="text-md font-bold uppercase tracking-wider text-white">Seções do site</h3><p className="text-xs text-zinc-500">Controle visibilidade e ordem da página pública V2.</p></div></div>
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
                {siteSections.map((section, index) => (
                  <div key={section.id} className="flex items-center gap-4 border-b border-zinc-800/80 px-5 py-4 last:border-0">
                    <span className="w-7 text-center text-xs font-black text-zinc-600">{index + 1}</span>
                    <span className="flex-1 text-sm font-bold text-white">{section.label}</span>
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400"><input type="checkbox" checked={section.ativo} onChange={(event) => atualizarSecao(section.id, { ativo: event.target.checked })} className="h-4 w-4 accent-emerald-500" /> Ativa</label>
                    <button type="button" aria-label={`Mover ${section.label} para cima`} disabled={index === 0} onClick={() => moverSecao(index, -1)} className="rounded-lg border border-zinc-800 p-2 text-zinc-300 disabled:opacity-30"><FiArrowUp /></button>
                    <button type="button" aria-label={`Mover ${section.label} para baixo`} disabled={index === siteSections.length - 1} onClick={() => moverSecao(index, 1)} className="rounded-lg border border-zinc-800 p-2 text-zinc-300 disabled:opacity-30"><FiArrowDown /></button>
                  </div>
                ))}
              </div>
              <button onClick={salvar} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-xs font-black uppercase tracking-wider text-black"><FiCheck className="h-5 w-5" />Salvar seções</button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
