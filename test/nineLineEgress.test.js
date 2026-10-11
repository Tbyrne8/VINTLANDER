import test from "node:test";
import assert from "node:assert/strict";
import {
  echoSectors,
  formatCardinalEgress,
  formatEchoEgress,
} from "../src/utils/nineLineEgress.js";

test("cardinal egress uses nautical miles", () => {
  assert.equal(
    formatCardinalEgress("5", "WEST"),
    "EGRESS 5 NAUTICAL MILES WEST"
  );
});

test("Echo sectors map Alpha, Bravo, Charlie and Delta clockwise", () => {
  assert.deepEqual(
    echoSectors.map((sector) => [sector.id, sector.direction]),
    [
      ["ALPHA", "NORTH"],
      ["BRAVO", "EAST"],
      ["CHARLIE", "SOUTH"],
      ["DELTA", "WEST"],
    ]
  );
});

test("Echo egress records the grid, sector and distance", () => {
  assert.equal(
    formatEchoEgress("30u wb 71301 73353", "CHARLIE", "5"),
    "ECHO POINT 30U WB 71301 73353, CHARLIE 5"
  );
});
