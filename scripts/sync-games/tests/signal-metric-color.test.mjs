import assert from "node:assert/strict";
import test from "node:test";
import { getSignalMetricBarClass } from "../../../lib/signals/get-signal-metric-bar-class.ts";
import { getSignalIndicatorPresentation } from "../../../lib/signals/get-signal-indicator-presentation.ts";

test("usa vermelho abaixo de 40%", () => {
  assert.equal(getSignalMetricBarClass(0), "bg-red-500");
  assert.equal(getSignalMetricBarClass(39), "bg-red-500");
});

test("usa amarelo de 40% a 69%", () => {
  assert.equal(getSignalMetricBarClass(40), "bg-amber-400");
  assert.equal(getSignalMetricBarClass(69), "bg-amber-400");
});

test("usa verde de 70% a 100%", () => {
  assert.equal(getSignalMetricBarClass(70), "bg-emerald-500");
  assert.equal(getSignalMetricBarClass(100), "bg-emerald-500");
});

test("mapeia estados para tons e ícones sem alterar o estado", () => {
  assert.deepEqual(getSignalIndicatorPresentation("Quente"), { icon: "flame", tone: "hot" });
  assert.deepEqual(getSignalIndicatorPresentation("Aquecendo"), { icon: "flame", tone: "warming" });
  assert.deepEqual(getSignalIndicatorPresentation("Neutro"), { icon: "minus", tone: "neutral" });
  assert.deepEqual(getSignalIndicatorPresentation("Frio"), { icon: "snowflake", tone: "cold" });
});

test("mapeia tendências para tons e ícones sem alterar a tendência", () => {
  assert.deepEqual(getSignalIndicatorPresentation("Subindo"), { icon: "trending-up", tone: "rising" });
  assert.deepEqual(getSignalIndicatorPresentation("Estável"), { icon: "minus", tone: "stable" });
  assert.deepEqual(getSignalIndicatorPresentation("Caindo"), { icon: "trending-down", tone: "falling" });
});
