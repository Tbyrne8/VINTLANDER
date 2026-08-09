import test from "node:test";
import assert from "node:assert/strict";
import { markCheckInField } from "../src/utils/checkInMarking.js";

const accepts = (field, entered, expected) =>
  assert.equal(markCheckInField(field, entered, expected), true);
const rejects = (field, entered, expected) =>
  assert.equal(markCheckInField(field, entered, expected), false);

test("position and altitude accepts equivalent formats", () => {
  accepts("positionAltitude", "NORTH ANGELS 12", "HOLDING NORTH, ANGELS 12");
  accepts("positionAltitude", "HOLDING EAST 14,000 FEET", "HOLDING EAST, ANGELS 14");
  accepts("positionAltitude", "SOUTH ANGELS EIGHT", "HOLDING SOUTH, 8000 FT");
  accepts("positionAltitude", "IP COD ANGELS 18", "ESTABLISHED IN IP COD, 18000 FT");
  accepts("positionAltitude", "BP DAGGER 1000", "ROUTING TO BP DAGGER, 1000 FT");
});

test("position and altitude rejects wrong or incomplete answers", () => {
  rejects("positionAltitude", "WEST ANGELS 12", "HOLDING NORTH, ANGELS 12");
  rejects("positionAltitude", "NORTH ANGELS 15", "HOLDING NORTH, ANGELS 16");
  rejects("positionAltitude", "HOLDING NORTH", "HOLDING NORTH, ANGELS 12");
  rejects("positionAltitude", "IP OTHER ANGELS 18", "ESTABLISHED IN IP COD, 18000 FT");
});

test("aircraft type tolerates common F/A-18 notation", () => {
  accepts("aircraftNumberType", "2 X FA 18", "2 X F/A-18E");
  accepts("aircraftNumberType", "TWO FA-18", "2 X F/A-18E");
  accepts("aircraftNumberType", "2 F/A-18S", "2 X F/A-18E");
  rejects("aircraftNumberType", "1 FA 18", "2 X F/A-18E");
  rejects("aircraftNumberType", "2 F-16", "2 X F/A-18E");
});

test("mission, ordnance, codes and remarks accept spoken variants", () => {
  accepts("missionNumber", "MISSION ALPHA BRAVO ONE TWO THREE", "MISSION AB123");
  accepts("ordnance", "TWO GBU-12, 20MM", "2 X GBU-12, 20MM");
  accepts("downlinkCode", "ONE TWO THREE FOUR", "1234");
  accepts("abortCode", "CH", "CHARLIE HOTEL");
  accepts("remarks", "NIL", "NO FURTHER REMARKS");
});
