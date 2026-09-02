import type { EstadoJogo, TendenciaJogo } from "@/lib/signals/types";

export type SignalIndicatorIcon = "flame" | "snowflake" | "minus" | "trending-up" | "trending-down";
export type SignalIndicatorTone = "hot" | "warming" | "cold" | "neutral" | "rising" | "stable" | "falling";

type SignalIndicatorPresentation = {
  icon: SignalIndicatorIcon;
  tone: SignalIndicatorTone;
};

const indicatorPresentation: Record<EstadoJogo | TendenciaJogo, SignalIndicatorPresentation> = {
  Quente: { icon: "flame", tone: "hot" },
  Aquecendo: { icon: "flame", tone: "warming" },
  Frio: { icon: "snowflake", tone: "cold" },
  Neutro: { icon: "minus", tone: "neutral" },
  Subindo: { icon: "trending-up", tone: "rising" },
  Estável: { icon: "minus", tone: "stable" },
  Caindo: { icon: "trending-down", tone: "falling" },
};

export function getSignalIndicatorPresentation(
  value: EstadoJogo | TendenciaJogo,
): SignalIndicatorPresentation {
  return indicatorPresentation[value];
}
