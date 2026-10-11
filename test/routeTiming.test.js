import test from "node:test";
import assert from "node:assert/strict";
import {
  getScaledRouteDurationMs,
  maximumRouteDurationMs,
  minimumRouteDurationMs,
} from "../src/utils/routeTiming.js";

test("MQ-9 routing remains observable over a twenty kilometre leg", () => {
  assert.equal(getScaledRouteDurationMs(20000, 75), 133333.33333333334);
});

test("route timing retains sensible lower and upper bounds", () => {
  assert.equal(getScaledRouteDurationMs(100, 200), minimumRouteDurationMs);
  assert.equal(getScaledRouteDurationMs(1000000, 35), maximumRouteDurationMs);
});
