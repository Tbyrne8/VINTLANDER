import test from "node:test";
import assert from "node:assert/strict";
import {
  formatOffsetReference,
  getNineLineControlPoints,
  getNineLineControlPointType,
} from "../src/utils/nineLineControlPoint.js";

const points = [
  { id: "IP-1", type: "ip", name: "WEST" },
  { id: "BP-1", type: "bp", name: "BADGER" },
];

test("fixed-wing aircraft receive only mapped IPs", () => {
  assert.equal(getNineLineControlPointType("F/A-18E Super Hornet"), "ip");
  assert.deepEqual(getNineLineControlPoints(points, "F-16C"), [points[0]]);
});

test("helicopters receive only mapped BPs", () => {
  assert.equal(getNineLineControlPointType("Apache AH-64E"), "bp");
  assert.deepEqual(getNineLineControlPoints(points, "Tiger HAD"), [points[1]]);
});

test("distance and cardinal references format for line 1", () => {
  assert.equal(formatOffsetReference("5 nm", "NORTHWEST"), "5 NM NORTHWEST");
});
