import test from "node:test";
import assert from "node:assert/strict";
import {
  cardinalHeadingOptions,
  formatCardinalHeading,
  formatDegreeHeading,
  normaliseHeadingDegrees,
  normaliseHeadingTolerance,
} from "../src/utils/nineLineHeading.js";

test("cardinal heading options include reciprocal axes", () => {
  assert.ok(cardinalHeadingOptions.includes("NORTH TO SOUTH"));
  assert.ok(cardinalHeadingOptions.includes("NORTHEAST TO SOUTHWEST"));
  assert.ok(cardinalHeadingOptions.includes("SOUTH TO NORTH"));
});

test("degree heading includes plus or minus tolerance", () => {
  assert.equal(
    formatDegreeHeading("280", "30"),
    "280 DEGREES PLUS OR MINUS 30 DEGREES"
  );
});

test("cardinal headings accept an optional plus or minus tolerance", () => {
  assert.equal(
    formatCardinalHeading("NORTH TO SOUTH", "30"),
    "NORTH TO SOUTH PLUS OR MINUS 30 DEGREES"
  );
  assert.equal(formatCardinalHeading("EAST TO WEST", ""), "EAST TO WEST");
});

test("heading and tolerance remain inside valid limits", () => {
  assert.equal(normaliseHeadingDegrees("400"), "360");
  assert.equal(normaliseHeadingDegrees("-5"), "0");
  assert.equal(normaliseHeadingTolerance("200"), "180");
});
