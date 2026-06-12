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
  useEffect(() => {

async function carregarConfig() {

  const { data, error } = await supabase
    .from("config_site")
    .select("*")
    .limit(1)
    .single();

  if(data){

    setWhatsapp(data.whatsapp || "");
    setInstagram(data.instagram || "");
    setTelegram(data.telegram || "");
    setPopupLink(data.popup_link || "");

  }

  if(error){
    console.log(error);
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
      popup_link: popupLink
    })
    .eq("id", 1)
    .select();

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

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    alert(JSON.stringify(error));
    return;
  }

  alert("Salvo!");
}
async function adicionarPlataforma() {
  const { error } = await supabase
    .from("plataformas")
    .insert({
      nome: nomePlataforma,
      link: linkPlataforma,
      imagem: imagemPlataforma,
      ativo: true,
      ordem: ordemPlataforma,
    });

  if (error) {
    console.log(error);
    alert("Erro ao adicionar plataforma");
    return;
  }

  alert("Plataforma adicionada!");

  setNomePlataforma("");
  setLinkPlataforma("");
  setImagemPlataforma("");
  setOrdemPlataforma(0);

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
      Adicionar Plataforma
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
      </div>
    ))}
  </div>
</div>

        </div>

      </div>

    </main>

  );

}