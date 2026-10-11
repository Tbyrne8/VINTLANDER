import test from "node:test";
import assert from "node:assert/strict";
import { generateCheckIn } from "../src/utils/checkInGenerator.js";

test("voice check-in pauses after callsign and says mission number", () => {
  const scenario = generateCheckIn("typhoon", {
    callsign: "RAZOR 21",
    missionNumber: "MISSION AB123",
  });
  const voiceLines = scenario.transmissions[0].voiceLines;

  assert.equal(voiceLines[1], "THIS IS Razor two one...");
  assert.equal(
    voiceLines[2],
    "MISSION NUMBER ALPHA BRAVO ONE TWO THREE."
  );
});
