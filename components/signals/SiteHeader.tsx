import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { HeaderSocialLinks } from "@/components/signals/SocialNavigation";
import type { Aparencia, SocialNavItemConfig } from "@/lib/signals/types";

export function SiteHeader({ aparencia, whatsapp, buttonText = "WhatsApp", active = true, socialItems }: { aparencia: Aparencia | null; whatsapp?: string; buttonText?: string; active?: boolean; socialItems: SocialNavItemConfig[] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Ir para o início">
          <img src={aparencia?.logo_url || "/logo.webp"} alt="" className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12" />
          <span className="hidden truncate text-base font-black uppercase tracking-tight min-[480px]:block sm:text-xl">
            {aparencia?.nome_site || "Slot da Sorte"}
          </span>
        </Link>
        <div className="header-actions">
          <HeaderSocialLinks items={socialItems} />
          {active && whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={buttonText} className="header-whatsapp signal-button px-3 py-2 text-xs sm:px-4">
              <MessageCircle size={16} aria-hidden /><span className="hidden sm:inline">{buttonText}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
