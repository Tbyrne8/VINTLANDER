import test from "node:test";
import assert from "node:assert/strict";
import {
  createWeaponReleaseCall,
  getWeaponReleaseDelayMs,
  isMissileOrdnance,
} from "../src/utils/weaponReleaseCall.js";

test("missiles use the rifle release call", () => {
  assert.equal(isMissileOrdnance("2 X AGM-65 MAVERICK"), true);
  assert.equal(createWeaponReleaseCall("2 X HELLFIRE"), "rifle");
});

test("non-missile weapons vary their release call", () => {
  assert.equal(createWeaponReleaseCall("2 X GBU-12", () => 0.1), "weapon away");
  assert.equal(createWeaponReleaseCall("2 X GBU-12", () => 0.9), "one away");
});

test("release delay reflects aircraft speed", () => {
  assert.equal(getWeaponReleaseDelayMs("F/A-18", () => 0), 12000);
  assert.equal(getWeaponReleaseDelayMs("F/A-18", () => 1), 22000);
  assert.equal(getWeaponReleaseDelayMs("MQ-9 REAPER", () => 0), 24000);
  assert.equal(getWeaponReleaseDelayMs("AH-64 APACHE", () => 1), 32000);
});
