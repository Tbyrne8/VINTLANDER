import test from "node:test";
import assert from "node:assert/strict";
import { formatGeneratedBda } from "../src/utils/bdaReport.js";

test("successful attacks produce clear operational BDA", () => {
  assert.equal(formatGeneratedBda("hit", 9), "Target appears destroyed");
  assert.equal(formatGeneratedBda("hit", 10), "Vehicle destroyed");
  assert.equal(formatGeneratedBda("hit", 11), "Target neutralised");
});

test("unsuccessful attacks clearly describe remaining effects", () => {
  assert.match(formatGeneratedBda("near miss", 80), /damaged/i);
  assert.match(formatGeneratedBda("miss", 300), /remains active/i);
});
