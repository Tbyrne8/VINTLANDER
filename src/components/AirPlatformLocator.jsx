export default function AirPlatformLocator({
  platform,
  mapCenter,
  zoom,
  alwaysVisible = false,
  index = 0,
}) {
  if (!platform?.position || !mapCenter) return null;

  const offset = getOffsetMetres(mapCenter, platform.position);
  const range = Math.hypot(offset.eastMetres, offset.northMetres);
  const bearing = getBearingDegrees(offset.eastMetres, offset.northMetres);
  const viewRadius = getApproxViewRadiusMetres(zoom);

  if (range < viewRadius * 0.82) {
    return null;
  }

  const scale = Math.min(1, range / viewRadius);
  const tagOffset = alwaysVisible ? index * 3 : 0;
  const left =
    50 + (offset.eastMetres / Math.max(range, 1)) * scale * 42 + tagOffset;
  const top =
    50 - (offset.northMetres / Math.max(range, 1)) * scale * 42 + tagOffset;

  return (
    <div
      className={`airPlatformLocator ${alwaysVisible ? "allPlatformLocator" : ""}`}
      style={{
        left: `${clamp(left, 8, 92)}%`,
        top: `${clamp(top, 10, 90)}%`,
      }}
      title={`${platform.callsign} ${formatDistance(range)} ${bearing
        .toString()
        .padStart(3, "0")} deg`}
    >
      <span
        className="airPlatformArrow"
        style={{ transform: `rotate(${bearing}deg)` }}
      >
        ^
      </span>
      <strong>{platform.callsign}</strong>
      <small>
        {formatDistance(range)} / {bearing.toString().padStart(3, "0")} deg
      </small>
    </div>
  );
}

function getOffsetMetres(from, to) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos(toRadians((from.lat + to.lat) / 2));

  return {
    eastMetres: (to.lng - from.lng) * metresPerDegreeLng,
    northMetres: (to.lat - from.lat) * metresPerDegreeLat,
  };
}

function getBearingDegrees(eastMetres, northMetres) {
  return Math.round(
    (Math.atan2(eastMetres, northMetres) * 180) / Math.PI + 360
  ) % 360;
}

function getApproxViewRadiusMetres(zoom) {
  const radiusByZoom = {
    10: 52000,
    11: 26000,
    12: 13000,
    13: 6500,
    14: 3200,
    15: 1600,
    16: 800,
    17: 400,
    18: 200,
  };

  return radiusByZoom[zoom] || 6500;
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} KM`;
  }

  return `${Math.round(distance)} M`;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
