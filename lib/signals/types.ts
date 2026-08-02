export type EstadoJogo = "Frio" | "Neutro" | "Aquecendo" | "Quente";
export type TendenciaJogo = "Subindo" | "Estável" | "Caindo";
export type CategoriaJogo = "PG Games" | "PP Games" | "TADA Games" | "WG Games";

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
  storageImageUrl?: string;
  storageIconUrl?: string;
  estado?: EstadoJogo;
  tendencia?: TendenciaJogo;
  volatilidade?: number;
  destaque?: boolean;
  plataforma?: Plataforma;
};

export type Plataforma = {
  id: number | string;
  nome: string;
  link: string;
  imagem: string;
  ordem?: number;
  ativo?: boolean;
  is_new?: boolean;
  nova?: boolean;
  selo?: string;
};

export type ConfigSite = {
  whatsapp?: string;
  instagram?: string;
  telegram?: string;
  popup_link?: string;
  config_v2?: Record<string, unknown> | null;
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
  config_v2?: Record<string, unknown> | null;
};

export type SinalRow = {
  id: number | string;
  nome_jogo: string;
  categoria_jogo: "PG" | "PP" | "TADA" | "WG";
  cor_background?: string;
  bets?: string[];
  imagem_url?: string;
  ativo?: boolean;
  destaque?: boolean;
  game_id?: number | null;
};

export type GameMediaRow = {
  id?: number;
  external_id?: string;
  name?: string;
  provider_normalized: string;
  name_normalized: string;
  storage_image_url?: string | null;
  storage_icon_url?: string | null;
};

export type SiteSectionId = "banner" | "plataformas" | "distribuicoes" | "busca" | "catalogo" | "cta_whatsapp" | "footer";

export type SiteSectionConfig = {
  id: SiteSectionId;
  label: string;
  ativo: boolean;
  ordem: number;
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
