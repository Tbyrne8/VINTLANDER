export const cardinalDirections = [
  "NORTH",
  "NORTHEAST",
  "EAST",
  "SOUTHEAST",
  "SOUTH",
  "SOUTHWEST",
  "WEST",
  "NORTHWEST",
];

export function isRotaryWingAircraft(aircraft = "") {
  const value = String(aircraft).toUpperCase();

  return ["APACHE", "AH-64", "TIGER", "AH-1", "COBRA", "HELI"].some(
    (term) => value.includes(term)
  );
}

export function getNineLineControlPointType(aircraft = "") {
  return isRotaryWingAircraft(aircraft) ? "bp" : "ip";
}

export function getNineLineControlPoints(controlPoints = [], aircraft = "") {
  const requiredType = getNineLineControlPointType(aircraft);
  return controlPoints.filter((point) => point.type === requiredType);
}

export function formatNineLineControlPoint(point) {
  const type = String(point?.type || "ip").toUpperCase();
  const name = String(point?.name || "CONTROL").trim().toUpperCase();

  return name.startsWith(`${type} `) ? name : `${type} ${name}`;
}

export function formatOffsetReference(distance = "", direction = "NORTH") {
  const cleanDistance = String(distance).trim().toUpperCase();
  return cleanDistance ? `${cleanDistance} ${direction}` : direction;
}
