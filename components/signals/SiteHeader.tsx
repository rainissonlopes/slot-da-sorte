import { MessageCircle, Radio } from "lucide-react";
import type { Aparencia } from "@/lib/signals/types";

export function SiteHeader({ aparencia, whatsapp }: { aparencia: Aparencia | null; whatsapp?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <a href="#" className="flex min-w-0 items-center gap-3" aria-label="Ir para o início">
          <img src={aparencia?.logo_url || "/logo.webp"} alt="" className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12" />
          <span className="truncate text-base font-black uppercase tracking-tight sm:text-xl">
            {aparencia?.nome_site || "Slot da Sorte"}
          </span>
        </a>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 sm:flex">
            <Radio size={14} aria-hidden /> Sinais em tempo real
          </span>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="signal-button px-3 py-2 text-xs sm:px-4">
              <MessageCircle size={16} aria-hidden /><span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
