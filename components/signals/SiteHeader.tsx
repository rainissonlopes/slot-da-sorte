import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { HeaderSocialLinks } from "@/components/signals/SocialNavigation";
import type { Aparencia, SocialNavItemConfig } from "@/lib/signals/types";

export function SiteHeader({ aparencia, whatsapp, buttonText = "WhatsApp", active = true, socialItems }: { aparencia: Aparencia | null; whatsapp?: string; buttonText?: string; active?: boolean; socialItems: SocialNavItemConfig[] }) {
  return (
    <header className="site-header">
      <div className="site-header__inner mx-auto max-w-7xl">
        <Link href="/" className="site-brand" aria-label="Ir para o início">
          <img src={aparencia?.logo_url || "/logo.webp"} alt="" width={96} height={72} className="site-brand__logo" />
          <span className="site-brand__name">
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
