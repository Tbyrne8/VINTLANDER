export function getAttackTimingText(attackStatus, now = Date.now()) {
  const phase = attackStatus?.phase || "Attack pending";
  const remaining = (timestamp) => Math.max(0, Number(timestamp || 0) - now);
  const countdown = (milliseconds) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  if (phase === "IP inbound") return "Aircraft pushing";
  if (phase === "In hot") return "Awaiting clearance";

  if (phase === "Cleared hot") {
    const attackRemaining = remaining(
      Number(attackStatus.attackRunStartedAt || 0) +
        Number(attackStatus.attackRunDurationMs || 0)
    );
    return attackRemaining > 0
      ? `Attack run ${countdown(attackRemaining)}`
      : "Awaiting weapon release";
  }

  if (phase === "Weapon away") {
    const impactRemaining = remaining(attackStatus.weaponImpactAt);
    if (impactRemaining > 0) return `Impact in ${countdown(impactRemaining)}`;

    const bdaRemaining = remaining(attackStatus.bdaAvailableAt);
    return bdaRemaining > 0 ? `BDA in ${countdown(bdaRemaining)}` : "BDA available";
  }

  if (phase === "Effects observed") {
    const returnRemaining = Math.max(
      0,
      42000 - (now - Number(attackStatus.egressStartedAt || now))
    );
    return returnRemaining > 0
      ? `Egress / return ${countdown(returnRemaining)}`
      : "Return complete";
  }

  if (phase === "Re-attack required") return "Holding for re-attack";
  if (phase === "Abort" || phase === "Dry / no drop") return "Returning to hold";
  if (phase === "On station") return "On station";
  return "Awaiting clearance";
}
