import { MessageCircle } from "lucide-react";
export function WhatsAppBanner({ whatsapp }: { whatsapp?: string }) {
  if (!whatsapp) return null;
  return <section className="overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/20 via-[var(--tenant-surface)] to-[var(--tenant-surface)] p-6 sm:p-10"><div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div><span className="eyebrow">Comunidade VIP</span><h2 className="mt-2 text-2xl font-black sm:text-3xl">Receba os sinais direto no WhatsApp</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tenant-muted)]">Entre no grupo e receba atualizações, jogos em alta e novos sinais.</p></div><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="signal-button shrink-0 px-5 py-3"><MessageCircle size={19} /> Entrar no grupo</a></div></section>;
}
