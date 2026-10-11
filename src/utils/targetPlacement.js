import { getDistanceMetres } from "./geo.js";

const minimumControlPointSeparationMetres = 750;
const minimumGeneratedControlPointSeparationMetres = 1500;
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

export function getReciprocalBattlePosition(
  opPosition,
  enemyPosition,
  distanceMetres = 5000,
  exclusionPositions = []
) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos((opPosition.lat * Math.PI) / 180);
  const enemyEastMetres =
    (enemyPosition.lng - opPosition.lng) * metresPerDegreeLng;
  const enemyNorthMetres =
    (enemyPosition.lat - opPosition.lat) * metresPerDegreeLat;
  const enemyDistance = Math.hypot(enemyEastMetres, enemyNorthMetres) || 1;

  const reciprocalBearing = Math.atan2(
    -enemyEastMetres / enemyDistance,
    -enemyNorthMetres / enemyDistance
  );
  const angleOffsets = [0, 15, -15, 30, -30, 45, -45, 60, -60];
  let bestCandidate = null;
  let bestSeparation = -1;

  for (const angleOffset of angleOffsets) {
    const bearing = reciprocalBearing + (angleOffset * Math.PI) / 180;
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

    if (separation >= minimumGeneratedControlPointSeparationMetres) {
      return candidate;
    }

    if (separation > bestSeparation) {
      bestCandidate = candidate;
      bestSeparation = separation;
    }
  }

  return bestCandidate;
}

export {
  minimumControlPointSeparationMetres,
  minimumGeneratedControlPointSeparationMetres,
};
