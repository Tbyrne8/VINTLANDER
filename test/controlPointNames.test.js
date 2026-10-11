import test from "node:test";
import assert from "node:assert/strict";
import { getNextControlPointName } from "../src/utils/controlPointNames.js";

test("IP names alternate cardinal and NATO conventions", () => {
  const points = [{ type: "ip", name: "NORTH" }];

  assert.equal(getNextControlPointName("ip", points), "ALPHA");
});

test("BP names stay within an existing closely related theme", () => {
  const points = [
    { type: "bp", name: "COBRA" },
    { type: "bp", name: "VIPER" },
  ];

  assert.equal(getNextControlPointName("bp", points), "ADDER");
});

test("BP theme rotates deterministically between different maps", () => {
  const firstMap = [{ type: "ip", name: "NORTH", position: { lat: 1, lng: 1 } }];
  const secondMap = [{ type: "ip", name: "NORTH", position: { lat: 1, lng: 1.0001 } }];

  assert.notEqual(
    getNextControlPointName("bp", firstMap),
    getNextControlPointName("bp", secondMap)
  );
});

test("HA names use defensive conventions and ignore other point types", () => {
  const points = [
    { type: "ha", name: "HA SHIELD" },
    { type: "bp", name: "HAVEN" },
  ];

  assert.equal(getNextControlPointName("ha", points), "HAVEN");
});
