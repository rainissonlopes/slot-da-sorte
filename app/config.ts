// config.ts - Onde você troca os links sem sofrer
export const PLATAFORMAS = {
  PRINCIPAL: "https://link-da-sua-plataforma-favorita.com", // A que tá pagando mais hoje
  SECUNDARIAS: [
    "https://link-plataforma-02.com",
    "https://link-plataforma-03.com",
    "https://link-plataforma-04.com",
  ],
  RODIZIO_ATIVO: true // Se true, ele sorteia entre as secundárias. Se false, usa só a principal.
};