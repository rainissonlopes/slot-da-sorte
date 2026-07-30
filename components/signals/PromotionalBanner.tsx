import { ArrowRight, Sparkles } from "lucide-react";
import type { Aparencia } from "@/lib/signals/types";

export function PromotionalBanner({ aparencia, href }: { aparencia: Aparencia | null; href?: string }) {
  const title = aparencia?.titulo_home;
  const subtitle = aparencia?.subtitulo_home;
  const image = aparencia?.banner_principal_url;
  if (!image && !title && !subtitle) return null;
  return (
    <section className="relative isolate min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--tenant-surface)] shadow-2xl sm:min-h-[430px]">
      {image && <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/75 to-black/20" />
      <div className="flex min-h-[360px] max-w-3xl flex-col justify-center px-6 py-12 sm:min-h-[430px] sm:px-12">
        <span className="mb-5 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-white/80">
          <Sparkles size={14} /> Inteligência para suas jogadas
        </span>
        <h1 className="text-3xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{title || "Sinais de slot em tempo real"}</h1>
        {subtitle && <p className="mt-5 max-w-2xl text-sm leading-6 text-white/75 sm:text-lg">{subtitle}</p>}
        <a href={href || "#todos-os-jogos"} target={href ? "_blank" : undefined} rel={href ? "noopener noreferrer" : undefined} className="signal-button mt-7 w-fit px-5 py-3">
          {aparencia?.texto_cta || "Ver sinais agora"} <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
