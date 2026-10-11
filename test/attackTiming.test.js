import test from "node:test";
import assert from "node:assert/strict";
import { getAttackTimingText } from "../src/utils/attackTiming.js";

test("attack timing follows the current map phase", () => {
  const now = 1_000_000;
  assert.equal(
    getAttackTimingText(
      { phase: "Cleared hot", attackRunStartedAt: now - 10000, attackRunDurationMs: 90000 },
      now
    ),
    "Attack run 01:20"
  );
  assert.equal(
    getAttackTimingText(
      { phase: "Weapon away", weaponImpactAt: now + 12000, bdaAvailableAt: now + 57000 },
      now
    ),
    "Impact in 00:12"
  );
  assert.equal(
    getAttackTimingText(
      { phase: "Weapon away", weaponImpactAt: now - 1, bdaAvailableAt: now + 45000 },
      now
    ),
    "BDA in 00:45"
  );
  assert.equal(
    getAttackTimingText(
      { phase: "Effects observed", egressStartedAt: now - 18000 },
      now
    ),
    "Egress / return 00:24"
  );
});
