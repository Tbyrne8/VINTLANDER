import { getDistanceMetres } from "./geo.js";

const minimumControlPointSeparationMetres = 750;
const placementAttempts = 32;

function offsetPosition(center, eastMetres, northMetres) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos((center.lat * Math.PI) / 180);

  return {
    lat: center.lat + northMetres / metresPerDegreeLat,
    lng: center.lng + eastMetres / metresPerDegreeLng,
  };
}

export function findSafeTargetPosition(
  opPosition,
  exclusionPositions = [],
  random = Math.random
) {
  let bestCandidate = null;
  let bestSeparation = -1;

  for (let attempt = 0; attempt < placementAttempts; attempt += 1) {
    const bearing = random() * Math.PI * 2;
    const distanceMetres = 1500 + random() * 2000;
    const candidate = offsetPosition(
      opPosition,
      Math.sin(bearing) * distanceMetres,
      Math.cos(bearing) * distanceMetres
    );
    const separation = exclusionPositions.length
      ? Math.min(
          ...exclusionPositions.map((position) =>
            getDistanceMetres(candidate, position)
          )
        )
      : Number.POSITIVE_INFINITY;

    if (separation >= minimumControlPointSeparationMetres) return candidate;

    if (separation > bestSeparation) {
      bestCandidate = candidate;
      bestSeparation = separation;
    }
  }

  return bestCandidate;
}

export { minimumControlPointSeparationMetres };
