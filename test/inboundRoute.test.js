import test from "node:test";
import assert from "node:assert/strict";
import { getDistanceMetres } from "../src/utils/geo.js";
import { getInboundStartPosition } from "../src/utils/inboundRoute.js";

const routePoint = { lat: 51.2, lng: -1.98 };

test("slower aircraft begin closer to their routed point", () => {
  const jetDistance = getDistanceMetres(
    getInboundStartPosition(routePoint, "F/A-18E"),
    routePoint
  );
  const reaperDistance = getDistanceMetres(
    getInboundStartPosition(routePoint, "MQ-9 Reaper"),
    routePoint
  );
  const helicopterDistance = getDistanceMetres(
    getInboundStartPosition(routePoint, "Apache AH-64E"),
    routePoint
  );

  assert.ok(jetDistance > 45000);
  assert.ok(reaperDistance > 17000 && reaperDistance < 20000);
  assert.ok(helicopterDistance > 8000 && helicopterDistance < 11000);
  assert.ok(helicopterDistance < reaperDistance);
  assert.ok(reaperDistance < jetDistance);
});
