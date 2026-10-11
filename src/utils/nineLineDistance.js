export function normaliseNauticalMiles(value) {
  if (value === "") return "";
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return "";
  return String(Math.min(999, Math.max(0, number)));
}

export function formatNauticalMiles(value) {
  const distance = normaliseNauticalMiles(value);
  if (!distance) return "AS REQUIRED";
  return `${distance} ${Number(distance) === 1 ? "NAUTICAL MILE" : "NAUTICAL MILES"}`;
}
