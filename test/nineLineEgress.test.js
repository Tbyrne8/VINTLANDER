import test from "node:test";
import assert from "node:assert/strict";
import {
  echoSectors,
  formatCardinalEgress,
  formatEgressWithHeight,
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

test("egress retains or amends the height block", () => {
  assert.equal(
    formatEgressWithHeight("IP WEST", "current", "5000"),
    "IP WEST, CURRENT HEIGHT BLOCK"
  );
  assert.equal(
    formatEgressWithHeight("IP WEST", "amend", "5000"),
    "IP WEST, AMEND HEIGHT BLOCK 5000 FT"
  );
});
