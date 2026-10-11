export function getTargetDescription(target) {
  if (!target) return "NO TARGET SELECTED";

  if (target.source === "SELF-LED AUTO") {
    return target.name || target.id || "TARGET";
  }

  return [target.type, target.description].filter(Boolean).join(" - ");
}

export function getTargetOptionLabel(target) {
  const description = getTargetDescription(target);
  return description === target.id
    ? target.id
    : `${target.id} - ${description}`;
}
