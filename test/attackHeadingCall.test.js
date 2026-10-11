import test from "node:test";
import assert from "node:assert/strict";
import {
  createAttackHeadingCall,
  getHeadingCallDelayMs,
  makeIncorrectAttackHeading,
} from "../src/utils/attackHeadingCall.js";

test("attack heading calls are correct for the normal outcome", () => {
  assert.deepEqual(createAttackHeadingCall("280 DEGREES", () => 0.5), {
    correct: true,
    heading: "280 DEGREES",
  });
});

test("rare incorrect heading differs clearly from the 9-line", () => {
  assert.deepEqual(createAttackHeadingCall("280 DEGREES", () => 0.99), {
    correct: false,
    heading: "010 DEGREES",
  });
  assert.equal(
    makeIncorrectAttackHeading("NORTH TO SOUTH"),
    "SOUTH TO NORTH"
  );
});

test("heading call delay stays between ten and twenty seconds", () => {
  assert.equal(getHeadingCallDelayMs(() => 0), 10000);
  assert.equal(getHeadingCallDelayMs(() => 1), 20000);
  assert.ok(getHeadingCallDelayMs(() => 0.9999) <= 20000);
});
