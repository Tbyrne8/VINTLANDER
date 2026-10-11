import test from "node:test";
import assert from "node:assert/strict";
import { getDistanceMetres } from "../src/utils/geo.js";
import {
  findSafeTargetPosition,
  getReciprocalBattlePosition,
  minimumControlPointSeparationMetres,
} from "../src/utils/targetPlacement.js";

test("automatic target placement rejects a control-point clash", () => {
  const op = { lat: 51.20713, lng: -1.9793 };
  const clashingBp = { lat: 51.19186, lng: -1.9793 };
  const values = [0.5, 0.1, 0.25, 0.5];
  let index = 0;
  const random = () => values[index++] ?? 0.25;

  const target = findSafeTargetPosition(op, [clashingBp], random);

  assert.ok(
    getDistanceMetres(target, clashingBp) >=
      minimumControlPointSeparationMetres
  );
});

test("battle position is generated opposite the enemy across the OP", () => {
  const op = { lat: 51.20713, lng: -1.9793 };
  const enemySouth = { lat: 51.18, lng: -1.9793 };

  const battlePosition = getReciprocalBattlePosition(op, enemySouth);

  assert.ok(battlePosition.lat > op.lat, "BP should be north of the OP");
  assert.ok(Math.abs(battlePosition.lng - op.lng) < 0.00001);
  assert.ok(getDistanceMetres(op, battlePosition) >= 4900);
});

test("holding area can be generated ten kilometres behind the OP", () => {
  const op = { lat: 51.20713, lng: -1.9793 };
  const enemyEast = { lat: 51.20713, lng: -1.94 };

  const holdingArea = getReciprocalBattlePosition(op, enemyEast, 10000);

  assert.ok(holdingArea.lng < op.lng, "HA should be west of the OP");
  const distance = getDistanceMetres(op, holdingArea);
  assert.ok(distance >= 9800 && distance <= 10200);
});
