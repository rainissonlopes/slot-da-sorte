import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSiteSections } from "../../../lib/signals/site-sections.ts";

test("mantém todas as seções padrão quando a configuração ainda não existe", () => {
  const sections = normalizeSiteSections(undefined);

  assert.deepEqual(sections.map(({ id, ativo }) => [id, ativo]), [
    ["banner", true],
    ["plataformas", true],
    ["distribuicoes", true],
    ["busca", true],
    ["catalogo", true],
    ["cta_whatsapp", true],
    ["footer", true],
  ]);
});

test("aplica visibilidade e ordem sem aceitar seções desconhecidas", () => {
  const sections = normalizeSiteSections([
    { id: "catalogo", ativo: false, ordem: 0 },
    { id: "banner", ativo: true, ordem: 1 },
    { id: "desconhecida", ativo: true, ordem: -1 },
  ]);

  assert.equal(sections.length, 7);
  assert.equal(sections[0].id, "catalogo");
  assert.equal(sections[0].ativo, false);
  assert.equal(sections[1].id, "banner");
});
