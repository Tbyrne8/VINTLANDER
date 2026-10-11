import test from "node:test";
import assert from "node:assert/strict";
import {
  formatNauticalMiles,
  normaliseNauticalMiles,
} from "../src/utils/nineLineDistance.js";

test("line 3 formats distance in nautical miles", () => {
  assert.equal(formatNauticalMiles("4"), "4 NAUTICAL MILES");
  assert.equal(formatNauticalMiles("1"), "1 NAUTICAL MILE");
});

test("nautical-mile distance accepts decimals and rejects negatives", () => {
  assert.equal(normaliseNauticalMiles("4.5"), "4.5");
  assert.equal(normaliseNauticalMiles("-2"), "0");
});
