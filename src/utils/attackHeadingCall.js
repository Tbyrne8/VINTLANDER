const oppositeCardinalHeadings = {
  "NORTH TO SOUTH": "SOUTH TO NORTH",
  "NORTHEAST TO SOUTHWEST": "SOUTHWEST TO NORTHEAST",
  "EAST TO WEST": "WEST TO EAST",
  "SOUTHEAST TO NORTHWEST": "NORTHWEST TO SOUTHEAST",
  "SOUTH TO NORTH": "NORTH TO SOUTH",
  "SOUTHWEST TO NORTHEAST": "NORTHEAST TO SOUTHWEST",
  "WEST TO EAST": "EAST TO WEST",
  "NORTHWEST TO SOUTHEAST": "SOUTHEAST TO NORTHWEST",
};

export function makeIncorrectAttackHeading(plannedHeading = "") {
  const value = String(plannedHeading).trim().toUpperCase();
  const degreeMatch = value.match(/\b(\d{1,3})\b/);

  if (degreeMatch) {
    const incorrectDegrees = (Number(degreeMatch[1]) + 90) % 360;
    return value.replace(
      degreeMatch[1],
      String(incorrectDegrees || 360).padStart(3, "0")
    );
  }

  return oppositeCardinalHeadings[value] || "EAST TO WEST";
}

export function createAttackHeadingCall(plannedHeading, random = Math.random) {
  const correct = random() < 0.95;
  return {
    correct,
    heading: correct
      ? plannedHeading
      : makeIncorrectAttackHeading(plannedHeading),
  };
}

export function getHeadingCallDelayMs(random = Math.random) {
  return 10000 + Math.min(10000, Math.floor(random() * 10001));
}
