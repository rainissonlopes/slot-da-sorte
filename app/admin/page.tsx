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

const salvar = async () => {

  const { error } = await supabase
    .from("config_site")
    .upsert({
      id: 1,
      whatsapp,
      instagram,
      telegram,
      popup_link: popupLink,
    });

  if(error){
    console.log(error);
    alert("Erro ao salvar");
    return;
  }

  alert("Configurações salvas!");

};

  

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

        </div>

      </div>

    </main>

  );

}