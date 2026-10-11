export const routeAnimationTimeScale = 0.5;
export const minimumRouteDurationMs = 30000;
export const maximumRouteDurationMs = 360000;

export function getScaledRouteDurationMs(distanceMetres, speedMetresPerSecond) {
  const safeDistance = Math.max(0, Number(distanceMetres) || 0);
  const safeSpeed = Math.max(1, Number(speedMetresPerSecond) || 1);
  const scaledDuration =
    (safeDistance / safeSpeed) * 1000 * routeAnimationTimeScale;

  return Math.min(
    maximumRouteDurationMs,
    Math.max(minimumRouteDurationMs, scaledDuration)
  );
}
