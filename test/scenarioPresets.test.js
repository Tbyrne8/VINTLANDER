import test from "node:test";
import assert from "node:assert/strict";
import mgrs from "mgrs";
import { getScenarioPreset, scenarioPresets } from "../src/utils/scenarioPresets.js";
import { getDistanceMetres } from "../src/utils/geo.js";

function positionFromGrid(grid) {
  const [lng, lat] = mgrs.toPoint(grid);
  return { lat, lng };
}

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

test("Copehill IPs and BPs provide useful stand-off from the OP", () => {
  const scenario = getScenarioPreset("copehill-down");
  const opPosition = positionFromGrid(scenario.opGrid);

  for (const point of scenario.controlPoints) {
    const distance = getDistanceMetres(opPosition, positionFromGrid(point.grid));
    const minimumDistance = point.type === "ip" ? 9000 : 3500;

    assert.ok(distance >= minimumDistance, `${point.name} is only ${distance}m from the OP`);
  }
});
