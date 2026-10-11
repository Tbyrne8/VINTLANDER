export const cardinalHeadingOptions = [
  "NORTH TO SOUTH",
  "NORTHEAST TO SOUTHWEST",
  "EAST TO WEST",
  "SOUTHEAST TO NORTHWEST",
  "SOUTH TO NORTH",
  "SOUTHWEST TO NORTHEAST",
  "WEST TO EAST",
  "NORTHWEST TO SOUTHEAST",
];

export function normaliseHeadingDegrees(value) {
  if (value === "") return "";
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return "";
  return String(Math.min(360, Math.max(0, number)));
}

export function normaliseHeadingTolerance(value) {
  if (value === "") return "";
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return "";
  return String(Math.min(180, Math.max(0, number)));
}

export function formatDegreeHeading(heading, tolerance) {
  const degrees = normaliseHeadingDegrees(heading);
  const spread = normaliseHeadingTolerance(tolerance);

  if (!degrees) return "AS REQUIRED";
  if (!spread || spread === "0") return `${degrees} DEGREES`;
  return `${degrees} DEGREES PLUS OR MINUS ${spread} DEGREES`;
}

export function formatCardinalHeading(direction, tolerance = "") {
  const heading = cardinalHeadingOptions.includes(direction)
    ? direction
    : cardinalHeadingOptions[0];
  const spread = normaliseHeadingTolerance(tolerance);

  return !spread || spread === "0"
    ? heading
    : `${heading} PLUS OR MINUS ${spread} DEGREES`;
}
