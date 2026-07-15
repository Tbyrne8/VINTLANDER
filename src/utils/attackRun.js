function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function interpolate(from, to, progress) {
  if (!from || !to) return from || to;
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
  };
}

function pointFromBearing(origin, bearingDegrees, distanceMetres) {
  const radius = 6371000;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const latitude = (origin.lat * Math.PI) / 180;
  const longitude = (origin.lng * Math.PI) / 180;
  const angularDistance = distanceMetres / radius;
  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const destinationLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLatitude)
    );

  return {
    lat: (destinationLatitude * 180) / Math.PI,
    lng: (destinationLongitude * 180) / Math.PI,
  };
}

function parseAttackHeading(brief) {
  const heading = Number(String(brief?.heading || "").match(/\d{1,3}/)?.[0]);
  return Number.isFinite(heading) ? heading % 360 : 45;
}

export function getAttackRunGeometry(attackStatus, brief, platform, now = Date.now()) {
  now = attackStatus?.pausedAt || now;
  const target = attackStatus?.attackTarget?.position || brief?.target?.position;
  if (!target) return null;

  const heading = parseAttackHeading(brief?.brief || brief);
  const entry = pointFromBearing(target, (heading + 180) % 360, 9000);
  const release = pointFromBearing(target, (heading + 180) % 360, 3000);
  const hold =
    attackStatus?.attackPlatform?.routePosition ||
    platform?.routePosition ||
    pointFromBearing(target, (heading + 220) % 360, 12000);
  const egress = pointFromBearing(target, (heading + 95) % 360, 11000);
  const phaseElapsed = Math.max(0, now - (attackStatus?.phaseStartedAt || now));
  const phase = attackStatus?.phase || "Attack pending";
  let aircraftPosition = hold;
  let routeFrom = hold;
  let routeTo = entry;

  if (phase === "IP inbound") {
    aircraftPosition = interpolate(hold, entry, clamp(phaseElapsed / 18000));
  } else if (["In hot", "Cleared hot"].includes(phase)) {
    routeFrom = entry;
    routeTo = release;
    aircraftPosition = interpolate(entry, release, clamp(phaseElapsed / 16000));
  } else if (["Weapon away", "Effects observed", "Re-attack required"].includes(phase)) {
    routeFrom = release;
    routeTo = egress;
    const egressElapsed = Math.max(
      0,
      now - (attackStatus.egressStartedAt || attackStatus.weaponReleasedAt || attackStatus.phaseStartedAt || now)
    );
    aircraftPosition = interpolate(release, egress, clamp(egressElapsed / 26000));
  } else if (["Abort", "Dry / no drop"].includes(phase)) {
    routeFrom = entry;
    routeTo = hold;
    aircraftPosition = interpolate(entry, hold, clamp(phaseElapsed / 18000));
  }

  const weaponReleasedAt = attackStatus?.weaponReleasedAt;
  const weaponImpactAt = attackStatus?.weaponImpactAt;
  const impactPosition = attackStatus?.impactPosition || target;
  const weaponProgress =
    weaponReleasedAt && weaponImpactAt
      ? clamp((now - weaponReleasedAt) / Math.max(weaponImpactAt - weaponReleasedAt, 1))
      : 0;
  const weaponPosition = weaponReleasedAt
    ? interpolate(release, impactPosition, weaponProgress)
    : null;
  const impactVisible = Boolean(
    impactPosition &&
      (attackStatus?.impactObservedAt || (weaponImpactAt && now >= weaponImpactAt))
  );

  return {
    target,
    hold,
    entry,
    release,
    egress,
    aircraftPosition,
    weaponPosition: weaponProgress < 1 ? weaponPosition : null,
    impactPosition,
    impactVisible,
    routeFrom,
    routeTo,
  };
}
