import test from "node:test";
import assert from "node:assert/strict";
import { getAttackRunGeometry } from "../src/utils/attackRun.js";

const target = { lat: 51.38, lng: -2.37 };
const hold = { lat: 51.4, lng: -2.42 };
const platform = { callsign: "PYTHON 12", routePosition: hold };
const brief = {
  target: { id: "TGT-001", position: target },
  brief: { heading: "090", egress: "AS DIRECTED" },
};

function distance(a, b) {
  const north = (a.lat - b.lat) * 111320;
  const east = (a.lng - b.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(north, east);
}

test("completed attack returns to originating IP/BP", () => {
  const startedAt = 1_000_000;
  const status = {
    phase: "Effects observed",
    phaseStartedAt: startedAt,
    egressStartedAt: startedAt,
    attackPlatform: platform,
    attackTarget: { id: "TGT-001", position: target },
  };

  const outbound = getAttackRunGeometry(status, brief, platform, startedAt + 9_000);
  assert.ok(distance(outbound.aircraftPosition, outbound.egress) > 100);

  const returning = getAttackRunGeometry(status, brief, platform, startedAt + 30_000);
  assert.deepEqual(returning.routeTo, hold);

  const complete = getAttackRunGeometry(status, brief, platform, startedAt + 45_000);
  assert.ok(distance(complete.aircraftPosition, hold) < 1);
});

test("explicit egress instruction suppresses automatic return", () => {
  const startedAt = 2_000_000;
  const explicitBrief = { ...brief, brief: { ...brief.brief, egress: "EGRESS SOUTH" } };
  const status = {
    phase: "Effects observed",
    phaseStartedAt: startedAt,
    egressStartedAt: startedAt,
    attackPlatform: platform,
    attackTarget: { id: "TGT-001", position: target },
  };

  const geometry = getAttackRunGeometry(status, explicitBrief, platform, startedAt + 60_000);
  assert.deepEqual(geometry.routeTo, geometry.egress);
  assert.ok(distance(geometry.aircraftPosition, geometry.egress) < 1);
});

test("re-attack remains on the egress leg", () => {
  const startedAt = 3_000_000;
  const status = {
    phase: "Re-attack required",
    phaseStartedAt: startedAt,
    egressStartedAt: startedAt,
    attackPlatform: platform,
    attackTarget: { id: "TGT-001", position: target },
  };

  const geometry = getAttackRunGeometry(status, brief, platform, startedAt + 40_000);
  assert.deepEqual(geometry.routeTo, geometry.egress);
});

test("on-station aircraft remains at its control point", () => {
  const status = {
    phase: "On station",
    phaseStartedAt: 4_000_000,
    attackPlatform: platform,
    attackTarget: { id: "TGT-001", position: target },
  };
  const geometry = getAttackRunGeometry(status, brief, platform, 4_100_000);

  assert.deepEqual(geometry.aircraftPosition, hold);
  assert.deepEqual(geometry.routeFrom, hold);
  assert.deepEqual(geometry.routeTo, hold);
});
