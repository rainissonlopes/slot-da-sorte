import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mergeSocialNav, resolveSocialNav } from "../../../lib/signals/social-nav.ts";
import { getGameThemeStyle, normalizeGameThemeColor, normalizeLegacySignalColor, resolveGameThemeColor } from "../../../lib/signals/game-theme.ts";

test("normaliza apenas cores hexadecimais de seis dígitos", () => {
  assert.equal(normalizeGameThemeColor(" #a1b2c3 "), "#A1B2C3");
  assert.equal(normalizeGameThemeColor("#fff"), null);
  assert.equal(normalizeGameThemeColor("rgb(0, 0, 0)"), null);
  assert.equal(normalizeGameThemeColor("red"), null);
  assert.equal(normalizeGameThemeColor("url(javascript:alert(1))"), null);
  assert.equal(getGameThemeStyle("red"), undefined);
  assert.equal(getGameThemeStyle("#a1b2c3")["--game-theme"], "#A1B2C3");
});

test("converte somente formatos RGB legados opacos para hexadecimal seguro", () => {
  assert.equal(normalizeLegacySignalColor("rgb(15, 18, 70)"), "#0F1246");
  assert.equal(normalizeLegacySignalColor("rgba(68,28,5,255)"), "#441C05");
  assert.equal(normalizeLegacySignalColor("rgba(97,33,201,1)"), "#6121C9");
  assert.equal(normalizeLegacySignalColor("rgb(256, 0, 0)"), null);
  assert.equal(normalizeLegacySignalColor("rgba(255, 0, 0, 0.5)"), null);
  assert.equal(normalizeLegacySignalColor("rgb(0, 0, 0);background:red"), null);
});

test("resolve a cor pelo override explÃ­cito, origem antiga e fallback clÃ¡ssico", () => {
  assert.equal(resolveGameThemeColor({ signalColor: "#123456", gameThemeColor: "#ABCDEF" }), "#ABCDEF");
  assert.equal(resolveGameThemeColor({ signalColor: "rgb(15, 18, 70)", gameThemeColor: "#ABCDEF" }), "#ABCDEF");
  assert.equal(resolveGameThemeColor({ signalColor: "invÃ¡lida", gameThemeColor: "#abcdef" }), "#ABCDEF");
  assert.equal(resolveGameThemeColor({ signalColor: "rgb(15, 18, 70)", gameThemeColor: null }), "#0F1246");
  assert.equal(resolveGameThemeColor({ signalColor: undefined, gameThemeColor: "#fedcba" }), "#FEDCBA");
  assert.equal(resolveGameThemeColor({ signalColor: "rgba(1, 2, 3, 0.5)", gameThemeColor: "#123" }), null);
  assert.equal(resolveGameThemeColor({}), null);
});

test("GameCard e TrendingGames compartilham o resolvedor e mantÃªm o contrato responsivo", async () => {
  const [gameCard, trendingGames, gamesGrid, styles] = await Promise.all([
    readFile(new URL("../../../components/signals/GameCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../components/signals/TrendingGames.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../components/signals/GamesGrid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(gameCard, /resolveGameThemeColor\(\{[\s\S]*signalColor:\s*jogo\.cor,[\s\S]*gameThemeColor:\s*jogo\.themeColor/);
  assert.match(trendingGames, /resolveGameThemeColor\(\{[\s\S]*signalColor:\s*jogo\.cor,[\s\S]*gameThemeColor:\s*jogo\.themeColor/);
  assert.match(gameCard, /game-bet-suggestions/);
  assert.match(gameCard, /game-image-detail/);
  assert.match(gameCard, /game-access-button/);
  assert.match(trendingGames, /game-image-detail/);
  assert.match(gamesGrid, /grid-cols-2[\s\S]*md:grid-cols-3[\s\S]*lg:grid-cols-4/);
  assert.match(styles, /\.signal-card\[data-themed="true"\][\s\S]*var\(--game-theme\)/);
  assert.match(styles, /var\(--game-theme\) 42%, #101010/);
  assert.match(styles, /var\(--game-theme\) 28%, #101010/);
  assert.match(styles, /var\(--game-theme\) 75%, white/);
  assert.match(styles, /var\(--game-theme\) 18%, #0c1511/);
  assert.match(styles, /\.game-access-button\s*\{[^}]*background-color:\s*#00a63e;/s);
});

test("admin trata theme_color como override explícito e preserva a cor original", async () => {
  const admin = await readFile(new URL("../../../app/admin/page.tsx", import.meta.url), "utf8");

  assert.match(admin, />Cor do card</);
  assert.match(admin, /aria-label="Selecionar cor do card"/);
  assert.match(admin, /aria-label="Cor hexadecimal do card"/);
  assert.match(admin, /Usar cor original/);
  assert.match(admin, /setThemeColorSinal\(""\)/);
  assert.match(admin, /update\(\{ theme_color: normalizedThemeColor \}\)/);
  assert.match(admin, /normalizeLegacySignalColor\(corBackground\)/);
  assert.match(admin, /resolveGameThemeColor\(\{[\s\S]*signalColor: corBackground,[\s\S]*gameThemeColor: themeColorSinal/);
  assert.match(admin, /Cor personalizada/);
  assert.match(admin, /Usando cor original/);
  assert.match(admin, /Usando cor padrão/);
  assert.match(admin, /aria-live="polite"/);
  assert.match(admin, /aria-invalid=\{Boolean\(cardColorValidationError\)\}/);
  assert.match(admin, /onBlur=\{\(\) => \{[\s\S]*normalizeGameThemeColor\(themeColorSinal\)/);
  assert.match(admin, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(240px,320px\)\]/);
  assert.match(admin, /previewCardImage/);
  assert.match(admin, /game-bet-suggestions/);
  assert.match(admin, /game-access-button/);
  assert.match(admin, /Imagem personalizada/);
  assert.match(admin, /Usar imagem padrão do catálogo/);
  assert.match(admin, /imagem_personalizada: imagemPersonalizadaSinal/);
  assert.match(admin, /setImagemPersonalizadaSinal\(Boolean\(url\)\)/);
  assert.doesNotMatch(admin, /alert\("A cor temática deve usar o formato #RRGGBB\."\)/);
});

test("V2 propaga o override explícito de imagem ao resolvedor central", async () => {
  const [home, gameCard, trendingGames] = await Promise.all([
    readFile(new URL("../../../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../components/signals/GameCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../components/signals/TrendingGames.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(home, /imagemPersonalizada: sinal\.imagem_personalizada === true/);
  assert.match(gameCard, /manualImageOverride: jogo\.imagemPersonalizada === true/);
  assert.match(trendingGames, /manualImageOverride: jogo\.imagemPersonalizada === true/);
});

test("mantém Home e usa redes legadas configuradas quando social_nav ainda não existe", () => {
  const items = resolveSocialNav({
    instagram: "https://instagram.com/slot",
    telegram: "https://t.me/slot",
    whatsapp: "https://wa.me/5511999999999",
  });

  assert.deepEqual(items.filter((item) => item.enabled).map((item) => item.id), [
    "home",
    "instagram",
    "telegram",
    "whatsapp_vip",
  ]);
});

test("aplica ordem, destaque e desativação sem aceitar URL insegura", () => {
  const items = resolveSocialNav({
    config_v2: {
      social_nav: [
        { id: "telegram", label: "Canal", url: "https://t.me/canal", enabled: true, order: 1, highlighted: true },
        { id: "instagram", label: "Instagram", url: "javascript:alert(1)", enabled: true, order: 2, highlighted: false },
        { id: "tiktok", label: "TikTok", url: "https://tiktok.com/@slot", enabled: false, order: 3, highlighted: false },
      ],
    },
  });

  assert.equal(items[1].id, "telegram");
  assert.equal(items[1].highlighted, true);
  assert.equal(items.find((item) => item.id === "instagram")?.url, "");
  assert.equal(items.find((item) => item.id === "tiktok")?.enabled, false);
});

test("merge social preserva propriedades desconhecidas do config_v2", () => {
  const current = {
    future_setting: { active: true },
    social_nav: [{ id: "instagram", custom: "preservar" }],
  };
  const socialNav = resolveSocialNav({ config_v2: current });
  const merged = { ...current, social_nav: mergeSocialNav(current.social_nav, socialNav) };

  assert.deepEqual(merged.future_setting, { active: true });
  assert.equal(merged.social_nav[1].custom, "preservar");
});

test("contrato do header mantém redes em uma linha e prioriza WhatsApp no mobile", async () => {
  const [styles, headerComponent, homePage, socialComponent] = await Promise.all([
    readFile(new URL("../../../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../../../components/signals/SiteHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../components/signals/SocialNavigation.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.header-actions\s*\{[^}]*flex-wrap:\s*nowrap;/s);
  assert.match(styles, /@media \(max-width: 639px\)[\s\S]*\.header-whatsapp\s*\{[^}]*order:\s*1;/s);
  assert.match(styles, /@media \(max-width: 639px\)[\s\S]*\.header-social-links\s*\{[^}]*order:\s*2;/s);
  assert.match(styles, /@media \(max-width: 379px\)[\s\S]*\.header-social-tiktok\s*\{[^}]*display:\s*none;/s);
  assert.match(styles, /@media \(max-width: 639px\)/);
  assert.doesNotMatch(styles, /\.social-nav-shell/);
  assert.doesNotMatch(headerComponent, /Sinais em tempo real/);
  assert.match(headerComponent, /href="\/"/);
  assert.doesNotMatch(homePage, /<SocialNavigation/);
  assert.match(socialComponent, /\["instagram", "telegram", "tiktok"\]/);
  assert.doesNotMatch(socialComponent, /header-social-home/);
});
