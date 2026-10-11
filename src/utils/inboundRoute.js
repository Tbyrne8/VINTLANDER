function offsetPosition(center, eastMetres, northMetres) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos((center.lat * Math.PI) / 180);

  return {
    lat: center.lat + northMetres / metresPerDegreeLat,
    lng: center.lng + eastMetres / metresPerDegreeLng,
  };
}

function includesAny(value, terms) {
  const normalised = String(value || "").toUpperCase();
  return terms.some((term) => normalised.includes(term));
}

export function getInboundStartPosition(routePosition, aircraft = "") {
  if (
    includesAny(aircraft, ["APACHE", "AH-64", "TIGER", "AH-1", "COBRA", "HELI"])
  ) {
    return offsetPosition(routePosition, -8000, -5000);
  }

  if (includesAny(aircraft, ["MQ-9", "REAPER", "WATCHKEEPER", "UAV", "RPAS"])) {
    return offsetPosition(routePosition, -16000, -9000);
  }

  return offsetPosition(routePosition, -42000, -22000);
}
