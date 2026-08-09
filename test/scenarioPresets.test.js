import test from "node:test";
import assert from "node:assert/strict";
import mgrs from "mgrs";
import { getScenarioPreset, scenarioPresets } from "../src/utils/scenarioPresets.js";

test("scenario presets contain a valid OP and multiple IP/BP markers", () => {
  for (const scenario of scenarioPresets) {
    assert.equal(mgrs.toPoint(scenario.opGrid).length, 2);
    assert.ok(scenario.controlPoints.length >= 2);
    assert.ok(scenario.controlPoints.some((point) => point.type === "ip"));
    assert.ok(scenario.controlPoints.some((point) => point.type === "bp"));

    for (const point of scenario.controlPoints) {
      assert.equal(mgrs.toPoint(point.grid).length, 2);
    }
  }
});

test("Copehill Down is the default quick-start scenario", () => {
  assert.equal(scenarioPresets[0].id, "copehill-down");
  assert.equal(getScenarioPreset("copehill-down")?.opName, "OP COPEHILL");
});
