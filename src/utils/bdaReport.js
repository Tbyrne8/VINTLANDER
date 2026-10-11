const hitReports = [
  "Target appears destroyed",
  "Vehicle destroyed",
  "Target neutralised",
];

export function formatGeneratedBda(outcome, missDistanceMetres) {
  const roundedDistance = Math.max(0, Math.round(Number(missDistanceMetres) || 0));

  if (outcome === "hit") {
    return hitReports[roundedDistance % hitReports.length];
  }

  if (outcome === "near miss") {
    return "Impact close to target. Target appears damaged, effects uncertain";
  }

  return "No effect on target. Target remains active, re-attack required";
}
