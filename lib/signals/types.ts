export type EstadoJogo = "Frio" | "Neutro" | "Aquecendo" | "Quente";
export type TendenciaJogo = "Subindo" | "Estável" | "Caindo";
export type CategoriaJogo = "PG Games" | "PP Games" | "WG Games";

export type Jogo = {
  id: number | string;
  nome: string;
  cat: CategoriaJogo;
  dist: number;
  min: number;
  pad: number;
  max: number;
  cor: string;
  link: string;
  bets: string[];
  imagemUrl?: string;
  estado?: EstadoJogo;
  tendencia?: TendenciaJogo;
  volatilidade?: number;
  plataforma?: Plataforma;
};

export type Plataforma = {
  id: number | string;
  nome: string;
  link: string;
  imagem: string;
  ordem?: number;
  ativo?: boolean;
  nova?: boolean;
  selo?: string;
};

export type ConfigSite = {
  whatsapp?: string;
  instagram?: string;
  telegram?: string;
  popup_link?: string;
};

export type Aparencia = {
  nome_site?: string;
  logo_url?: string;
  favicon_url?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  titulo_home?: string;
  subtitulo_home?: string;
  texto_cta?: string;
  banner_principal_url?: string;
};

export type SinalRow = {
  id: number | string;
  nome_jogo: string;
  categoria_jogo: "PG" | "PP" | "WG";
  cor_background?: string;
  bets?: string[];
  imagem_url?: string;
};

export type SugestoesAposta = {
  bonus: string;
  conexao: string;
  extra: string;
  p1: string;
  p2: string;
  m1: string;
  m2: string;
};
