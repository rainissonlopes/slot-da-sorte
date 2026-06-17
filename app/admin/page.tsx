"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)

  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [telegram, setTelegram] = useState("");
  const [popupLink, setPopupLink] = useState("");
  const [configSite, setConfigSite] = useState<any>(null);
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [nomePlataforma, setNomePlataforma] = useState("");
  const [linkPlataforma, setLinkPlataforma] = useState("");
  const [imagemPlataforma, setImagemPlataforma] = useState("");
  const [ordemPlataforma, setOrdemPlataforma] = useState(0);
  const [plataformaEditando, setPlataformaEditando] = useState<any>(null);

  // Estados para Sinais
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
  }

  carregarConfig();
}, []);

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

  // Funções para Sinais
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

  return (

    <main className="min-h-screen bg-black text-white p-6">

      <div className="max-w-xl mx-auto">

        <h1 className="text-3xl font-black mb-8 text-green-400">
          Painel Admin
        </h1>

        <div className="space-y-5">

          <div>
            <label className="block mb-2 text-sm">
              Link WhatsApp
            </label>

            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"/>
          </div>

          <div>
            <label className="block mb-2 text-sm">
              Instagram
            </label>

            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
              placeholder="https://instagram.com/..."
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">
              Telegram
            </label>

            <input
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
              placeholder="https://t.me/..."
            />

            <div>
  <label className="block mb-2 text-sm">
    Link do Popup
  </label>

  <input
    value={popupLink}
    onChange={(e) => setPopupLink(e.target.value)}
    className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    placeholder="https://google.com"
  />
</div>
          </div>

          <button
            onClick={salvar}
            className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-400 transition-all font-bold text-black"
          >
            Salvar Configurações
          </button>

          <div className="mt-12 border-t border-zinc-800 pt-8">
  <h2 className="text-2xl font-black mb-6 text-green-400">
    Plataformas
  </h2>

  <div className="space-y-4">
    <input
      value={nomePlataforma}
      onChange={(e) => setNomePlataforma(e.target.value)}
      placeholder="Nome da plataforma"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <input
      value={linkPlataforma}
      onChange={(e) => setLinkPlataforma(e.target.value)}
      placeholder="Link da plataforma"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <input
      value={imagemPlataforma}
      onChange={(e) => setImagemPlataforma(e.target.value)}
      placeholder="URL da imagem"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <input
      type="number"
      value={ordemPlataforma}
      onChange={(e) => setOrdemPlataforma(Number(e.target.value))}
      placeholder="Ordem"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <button
      onClick={adicionarPlataforma}
      className="w-full h-12 rounded-xl bg-yellow-400 hover:bg-yellow-300 transition-all font-bold text-black"
    >
      {plataformaEditando
  ? "Salvar Alterações"
  : "Adicionar Plataforma"}
    </button>
  </div>

  <div className="mt-8 space-y-3">
    {plataformas.map((p) => (
      <div
        key={p.id}
        className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3"
      >
        <img
          src={p.imagem}
          alt={p.nome}
          className="w-14 h-14 rounded-xl object-cover bg-black"
        />

        <div className="flex-1">
          <div className="font-bold">{p.nome}</div>
          <div className="text-xs text-zinc-400 truncate">{p.link}</div>
          <div className="text-xs text-zinc-500">Ordem: {p.ordem}</div>
        </div>

        <button
  onClick={() => editarPlataforma(p)}
  className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-xl font-bold text-sm"
>
  Editar
</button>

        <button
          onClick={() => excluirPlataforma(p.id)}
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm"
        >
          Excluir
        </button>
      </div>
    ))}
  </div>
</div>

<div className="mt-12 border-t border-zinc-800 pt-8">
  <h2 className="text-2xl font-black mb-6 text-green-400">
    Sinais de Slots
  </h2>

  <div className="space-y-4">
    <input
      value={nomeJogo}
      onChange={(e) => setNomeJogo(e.target.value)}
      placeholder="Nome do Jogo (ex: Fortune Tiger)"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <select
      value={categoriaJogo}
      onChange={(e) => setCategoriaJogo(e.target.value)}
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4 text-white"
    >
      <option value="PG">PG Games</option>
      <option value="PP">PP Games</option>
      <option value="WG">WG Games</option>
    </select>

    <input
      value={imagemUrl}
      onChange={(e) => setImagemUrl(e.target.value)}
      placeholder="URL da Imagem ou ID do jogo (ex: 508)"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <input
      value={corBackground}
      onChange={(e) => setCorBackground(e.target.value)}
      placeholder="Cor de fundo (ex: #1c1c1e)"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <input
      value={betsString}
      onChange={(e) => setBetsString(e.target.value)}
      placeholder="Apostas/Valores sugeridos (ex: 0.50, 1.20, 2.40)"
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <button
      onClick={adicionarSinal}
      className="w-full h-12 rounded-xl bg-yellow-400 hover:bg-yellow-300 transition-all font-bold text-black"
    >
      {sinalEditando ? "Salvar Alterações" : "Adicionar Sinal"}
    </button>
  </div>

  <div className="mt-8 space-y-4">
    <input
      value={buscaSinal}
      onChange={(e) => {
        setBuscaSinal(e.target.value);
        setSinaisVisiveis(30);
      }}
      placeholder="🔍 Buscar sinal por nome..."
      className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-700 px-4"
    />

    <div className="space-y-3">
      {sinaisExibidos.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3"
        >
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
            className="w-14 h-14 rounded-xl object-cover bg-black"
          />

          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{s.nome_jogo}</div>
            <div className="text-xs text-zinc-400">Categoria: {s.categoria_jogo}</div>
            <div className="text-xs text-zinc-500 truncate">
              Bets: {s.bets && s.bets.length > 0
                ? (s.bets.length <= 5
                    ? s.bets.join(", ")
                    : s.bets.slice(0, 5).join(", ") + ` ... (${s.bets.length} total)`)
                : "Nenhuma"}
            </div>
          </div>

          <button
            onClick={() => editarSinal(s)}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-xl font-bold text-sm shrink-0"
          >
            Editar
          </button>

          <button
            onClick={() => excluirSinal(s.id)}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm shrink-0"
          >
            Excluir
          </button>
        </div>
      ))}
    </div>

    {sinaisFiltrados.length > sinaisVisiveis && (
      <button
        onClick={() => setSinaisVisiveis((prev) => prev + 30)}
        className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-all font-bold text-white mt-2"
      >
        Carregar Mais ({sinaisFiltrados.length - sinaisVisiveis} restantes)
      </button>
    )}
  </div>
</div>

        </div>

      </div>

    </main>

  );

}