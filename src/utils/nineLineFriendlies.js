import { getBearingDegrees, getDistanceMetres } from "./geo.js";

export const friendlyDirections = [
  "NORTH",
  "NORTHEAST",
  "EAST",
  "SOUTHEAST",
  "SOUTH",
  "SOUTHWEST",
  "WEST",
  "NORTHWEST",
];

export function getFullCardinalDirection(degrees) {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return friendlyDirections[index];
}

export function getFriendlyReferences(
  targets = [],
  attackTarget = null,
  observerPosition = null
) {
  if (!attackTarget?.position) return [];

  const friendlies = observerPosition
    ? [
        ...targets,
        {
          id: "observation-post",
          type: "friendly",
          description: "OP",
          position: observerPosition,
        },
      ]
    : targets;

  return friendlies
    .filter(
      (target) =>
        target.id !== attackTarget.id &&
        String(target.type).toLowerCase() === "friendly" &&
        target.position
    )
    .map((friendly) => {
      const distanceMetres = Math.round(
        getDistanceMetres(attackTarget.position, friendly.position)
      );
      const direction = getFullCardinalDirection(
        getBearingDegrees(attackTarget.position, friendly.position)
      );
      const name = String(friendly.description || friendly.id || "FRIENDLY UNIT")
        .trim()
        .toUpperCase();

      return {
        id: friendly.id,
        name,
        direction,
        distanceMetres,
        value: `${name}, ${direction} ${distanceMetres}M`,
      };
    })
    .sort((a, b) => a.distanceMetres - b.distanceMetres);
}

export function normaliseFriendlyDistance(value) {
  if (value === "") return "";
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return "";
  return String(Math.min(99999, Math.max(0, number)));
}

export function formatManualFriendly(direction, distance) {
  const cardinal = friendlyDirections.includes(direction) ? direction : "SOUTH";
  const metres = normaliseFriendlyDistance(distance);
  return metres
    ? `${cardinal} ${metres}M`
    : cardinal;
}
