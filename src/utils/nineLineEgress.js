import { formatMgrsValue } from "./mgrs.js";

export const egressCardinalDirections = ["NORTH", "EAST", "SOUTH", "WEST"];

export const echoSectors = [
  { id: "ALPHA", direction: "NORTH" },
  { id: "BRAVO", direction: "EAST" },
  { id: "CHARLIE", direction: "SOUTH" },
  { id: "DELTA", direction: "WEST" },
];

export function normaliseEgressDistance(value) {
  if (value === "") return "";
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return "";
  return String(Math.min(999, Math.max(0, number)));
}
export function formatCardinalEgress(distance, direction) {
  const nauticalMiles = normaliseEgressDistance(distance);
  const cardinal = egressCardinalDirections.includes(direction) ? direction : "NORTH";
  if (!nauticalMiles) return `EGRESS ${cardinal}`;
  return `EGRESS ${nauticalMiles} NAUTICAL MILES ${cardinal}`;
}

export function formatEchoEgress(grid, sector, distance) {
  const echoGrid = grid ? formatMgrsValue(grid) : "";
  const selectedSector = echoSectors.find((item) => item.id === sector) || echoSectors[0];
  const nauticalMiles = normaliseEgressDistance(distance);
  const suffix = nauticalMiles
    ? `${selectedSector.id} ${nauticalMiles}`
    : selectedSector.id;

  return `ECHO POINT ${echoGrid || "GRID REQUIRED"}, ${suffix}`;
}

export function formatEgressWithHeight(
  egress,
  heightMode = "current",
  heightFeet = "5000"
) {
  const base = String(egress || "AS DIRECTED").trim().toUpperCase();
  if (heightMode !== "amend") return `${base}, CURRENT HEIGHT BLOCK`;

  const feet = Math.min(
    30000,
    Math.max(1000, Math.round(Number(heightFeet || 5000) / 1000) * 1000)
  );
  return `${base}, AMEND HEIGHT BLOCK ${feet} FT`;
}

