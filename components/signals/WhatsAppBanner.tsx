import { MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/signals/SectionHeading";

export function WhatsAppBanner({ whatsapp }: { whatsapp?: string }) {
  if (!whatsapp) return null;

  return (
    <section aria-label="Receba os sinais no WhatsApp" className="overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/20 via-[var(--tenant-surface)] to-[var(--tenant-surface)] p-6 sm:p-10">
      <SectionHeading
        icon={<MessageCircle aria-hidden="true" />}
        eyebrow="Fique por dentro"
        title="Receba os sinais no WhatsApp"
        description="Entre no grupo e receba atualizações, jogos em alta e novos sinais."
        action={
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="signal-button shrink-0 px-5 py-3">
            <MessageCircle size={19} /> Entrar no grupo
          </a>
        }
      />
    </section>
  );
}
