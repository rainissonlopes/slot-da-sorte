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
  FiInstagram, 
  FiSend,
  FiRefreshCw,
  FiCpu,
  FiMenu,
  FiX
} from "react-icons/fi";

export default function AdminPage() {
  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  // Navigation and Layout states
  const [activeTab, setActiveTab] = useState("overview"); // overview | platforms | signals | config
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState("");

  // Site Configuration states
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [popupLink, setPopupLink] = useState("");
  const [configSite, setConfigSite] = useState<any>(null);

  // Platforms states
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [nomePlataforma, setNomePlataforma] = useState("");
  const [linkPlataforma, setLinkPlataforma] = useState("");
  const [imagemPlataforma, setImagemPlataforma] = useState("");
  const [ordemPlataforma, setOrdemPlataforma] = useState(0);
  const [plataformaEditando, setPlataformaEditando] = useState<any>(null);

  // Signals states
  const [sinais, setSinais] = useState<any[]>([]);
  const [nomeJogo, setNomeJogo] = useState("");
  const [categoriaJogo, setCategoriaJogo] = useState("PG");
  const [imagemUrl, setImagemUrl] = useState("");
  const [corBackground, setCorBackground] = useState("#1c1c1e");
  const [betsString, setBetsString] = useState("");
  const [sinalEditando, setSinalEditando] = useState<any>(null);

  const [buscaSinal, setBuscaSinal] = useState("");
  const [sinaisVisiveis, setSinaisVisiveis] = useState(30);

  const sinaisFiltrados = sinais.filter((s) =>
    s.nome_jogo.toLowerCase().includes(buscaSinal.toLowerCase().trim())
  );
  const sinaisExibidos = sinaisFiltrados.slice(0, sinaisVisiveis);

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

  // Load database configuration, platforms, and signals
  useEffect(() => {
    async function carregarConfig() {
      const { data, error } = await supabase
        .from("config_site")
        .select("*")
        .limit(1)
        .single();

      if (data) {
        setWhatsapp(data.whatsapp || "");
        setInstagram(data.instagram || "");
        setTelegram(data.telegram || "");
        setPopupLink(data.popup_link || "");
      }

      if (error) {
        console.log(error);
      }

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

      setLastFetchTime(new Date().toLocaleTimeString("pt-BR"));
    }

    carregarConfig();
  }, []);

  // CRUD site config
  async function salvar() {
    const { data, error } = await supabase
      .from("config_site")
      .update({
        whatsapp,
        instagram,
        telegram,
        popup_link: popupLink,
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

    alert("Salvo!");
  }

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
      ativo: true,
      ordem: ordemPlataforma,
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
    setPlataformaEditando(null);

    window.location.reload();
  }

  function editarPlataforma(p: any) {
    setPlataformaEditando(p);
    setNomePlataforma(p.nome || "");
    setLinkPlataforma(p.link || "");
    setImagemPlataforma(p.imagem || "");
    setOrdemPlataforma(p.ordem || 0);

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

  // CRUD signals
  async function adicionarSinal() {
    if (!nomeJogo || !categoriaJogo || !imagemUrl) {
      alert("Preencha todos os campos obrigatórios: Nome do jogo, Categoria e URL da imagem");
      return;
    }

    const betsArray = betsString
      ? betsString.split(",").map((b) => b.trim()).filter(Boolean)
      : [];

    const dados = {
      nome_jogo: nomeJogo,
      categoria_jogo: categoriaJogo,
      imagem_url: imagemUrl,
      cor_background: corBackground || "#1c1c1e",
      bets: betsArray,
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

    alert(sinalEditando ? "Sinal atualizado!" : "Sinal adicionado!");

    setNomeJogo("");
    setCategoriaJogo("PG");
    setImagemUrl("");
    setCorBackground("#1c1c1e");
    setBetsString("");
    setSinalEditando(null);

    window.location.reload();
  }

  function editarSinal(s: any) {
    setSinalEditando(s);
    setNomeJogo(s.nome_jogo || "");
    setCategoriaJogo(s.categoria_jogo || "PG");
    setImagemUrl(s.imagem_url || "");
    setCorBackground(s.cor_background || "#1c1c1e");
    setBetsString(s.bets ? s.bets.join(", ") : "");

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
    { id: "config", label: "Configurações", icon: FiSettings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-900">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-green-500 to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.35)]">
          <span className="text-black font-black text-xl tracking-tighter">S</span>
        </div>
        <div>
          <h1 className="font-black tracking-tighter text-md text-white">
            SLOT <span className="text-emerald-400">DA SORTE</span>
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
            <p className="text-[10px] text-zinc-500 truncate">Ativo</p>
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
              {activeTab === "config" && "Configurações do Site"}
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
              className="md:hidden p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all"
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
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{card.title}</p>
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
                  <p className="text-xs text-zinc-500">Escolha o que deseja fazer ou gerenciar a seguir.</p>
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
                    onClick={() => setActiveTab("config")}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    <FiSettings className="w-4 h-4" /> Configs
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
                      <div key={s.id} className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 hover:bg-zinc-900/20 transition-all">
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
                          s.categoria_jogo === "PP" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}>
                          {s.categoria_jogo}
                        </span>
                      </div>
                    ))}
                    {sinais.length === 0 && (
                      <p className="text-xs text-zinc-500 py-6 text-center">Nenhum sinal cadastrado.</p>
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
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-350 uppercase transition-colors cursor-pointer"
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
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Link de Afiliação
                    </label>
                    <input
                      value={linkPlataforma}
                      onChange={(e) => setLinkPlataforma(e.target.value)}
                      placeholder="ex: https://afiliado.com/..."
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      URL da Imagem
                    </label>
                    <input
                      value={imagemPlataforma}
                      onChange={(e) => setImagemPlataforma(e.target.value)}
                      placeholder="ex: https://sua-imagem.com/logo.webp"
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Ordem de Exibição
                    </label>
                    <input
                      type="number"
                      value={ordemPlataforma}
                      onChange={(e) => setOrdemPlataforma(Number(e.target.value))}
                      placeholder="0"
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
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
                      {plataformas.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-900/30 transition-all duration-150">
                          <td className="px-5 py-4">
                            <img
                              src={p.imagem}
                              alt={p.nome}
                              onError={(e) => { e.currentTarget.src = "/placeholder.webp"; }}
                              className="w-10 h-10 rounded-xl object-cover bg-black border border-zinc-850 shadow-md"
                            />
                          </td>
                          <td className="px-5 py-4 font-bold text-sm text-white">{p.nome}</td>
                          <td className="px-5 py-4 text-xs text-zinc-500 max-w-xs truncate hidden md:table-cell">
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                              {p.link}
                            </a>
                          </td>
                          <td className="px-5 py-4 text-sm text-zinc-400 font-mono font-bold">{p.ordem}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Ativo
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
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
                      }}
                      className="text-xs font-bold text-red-400 hover:text-red-350 uppercase transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Nome do Jogo
                    </label>
                    <input
                      value={nomeJogo}
                      onChange={(e) => setNomeJogo(e.target.value)}
                      placeholder="ex: Fortune Tiger"
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Categoria do Jogo
                    </label>
                    <select
                      value={categoriaJogo}
                      onChange={(e) => setCategoriaJogo(e.target.value)}
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    >
                      <option value="PG">PG Games</option>
                      <option value="PP">PP Games</option>
                      <option value="WG">WG Games</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      URL da Imagem ou ID
                    </label>
                    <input
                      value={imagemUrl}
                      onChange={(e) => setImagemUrl(e.target.value)}
                      placeholder="ex: 508 ou /jogos/tiger.webp"
                      className="w-full h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Cor de Fundo (Hex)
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={corBackground}
                        onChange={(e) => setCorBackground(e.target.value)}
                        placeholder="ex: #1c1c1e"
                        className="flex-1 h-11 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all font-mono"
                      />
                      <div 
                        className="w-11 h-11 rounded-xl border border-zinc-800 shadow-md"
                        style={{ backgroundColor: corBackground || "#1c1c1e" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Valores de Apostas (Separados por vírgula)
                    </label>
                    <textarea
                      value={betsString}
                      onChange={(e) => setBetsString(e.target.value)}
                      placeholder="ex: 0.50, 1.20, 2.40, 5.00"
                      className="w-full h-20 rounded-xl bg-zinc-950/80 border border-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all resize-none font-mono"
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

                <div className="overflow-x-auto max-h-[600px] border border-zinc-800/60 rounded-xl scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-zinc-950 z-10 border-b border-zinc-850">
                      <tr>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-20">Jogo</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400">Nome</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-32">Categoria</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 hidden md:table-cell">Sugestões de Bet</th>
                        <th className="px-5 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-400 w-40 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {sinaisExibidos.map((s) => (
                        <tr key={s.id} className="hover:bg-zinc-900/30 transition-all duration-150">
                          <td className="px-5 py-4">
                            <img
                              src={
                                s.imagem_url.startsWith("http") || s.imagem_url.startsWith("/")
                                  ? s.imagem_url
                                  : `https://reidoslotsinais.bet/images/games/${s.imagem_url}.webp`
                              }
                              alt={s.nome_jogo}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.webp";
                              }}
                              className="w-10 h-10 rounded-xl object-cover bg-black border border-zinc-850"
                            />
                          </td>
                          <td className="px-5 py-4 font-bold text-sm text-white">{s.nome_jogo}</td>
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
                                  <span key={i} className="bg-zinc-950 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-850 font-mono text-[10px]">
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
                      ))}
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

          {/* TAB 4: CONFIGURAÇÕES */}
          {activeTab === "config" && (
            <div className="max-w-2xl bg-zinc-900/30 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <FiSettings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider">Configurações do Site</h3>
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

                {/* Instagram */}
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FiInstagram className="text-pink-400" /> Link do Instagram
                  </label>
                  <div className="relative">
                    <FiInstagram className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4.5 h-4.5" />
                    <input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="ex: https://instagram.com/usuario"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Telegram */}
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FiSend className="text-blue-400" /> Link do Telegram
                  </label>
                  <div className="relative">
                    <FiSend className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4.5 h-4.5" />
                    <input
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="ex: https://t.me/canal"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-650 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Popup Link */}
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FiGlobe className="text-amber-400" /> Link do Popup Promocional
                  </label>
                  <div className="relative">
                    <FiGlobe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4.5 h-4.5" />
                    <input
                      value={popupLink}
                      onChange={(e) => setPopupLink(e.target.value)}
                      placeholder="ex: https://google.com"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none transition-all"
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

        </main>
      </div>
    </div>
  );
}