import test from "node:test";
import assert from "node:assert/strict";
import { getDistanceMetres } from "../src/utils/geo.js";
import {
  findSafeTargetPosition,
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
