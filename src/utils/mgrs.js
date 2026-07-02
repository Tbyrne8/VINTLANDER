import * as mgrs from "mgrs";

export function parseMgrs(value) {
  const normalised = normaliseMgrs(value);
  const [lng, lat] = mgrs.toPoint(normalised);

  return { lat, lng };
}

export function formatMgrs(position) {
  if (!position) return "NOT SET";

  return mgrs
    .forward([position.lng, position.lat])
    .replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/, "$1 $2 $3 $4");
}

export function normaliseMgrs(value) {
  const compact = String(value).toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{4,10})$/);

  if (!match) return compact;

  const [, zone, square, digits] = match;

  if (digits.length % 2 !== 0) return compact;

  const precision = digits.length / 2;
  const easting = digits.slice(0, precision).padEnd(5, "0");
  const northing = digits.slice(precision).padEnd(5, "0");

  return `${zone}${square}${easting}${northing}`;
}
