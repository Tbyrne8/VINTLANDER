export function isMissileOrdnance(ordnance = "") {
  return /\b(AGM|AIM|HELLFIRE|MAVERICK|BRIMSTONE|JAGM|SPIKE|SPEAR|MISSILE)\b/i.test(
    String(ordnance)
  );
}

export function createWeaponReleaseCall(ordnance = "", random = Math.random) {
  if (isMissileOrdnance(ordnance)) return "rifle";
  return random() < 0.5 ? "weapon away" : "one away";
}

export function getWeaponReleaseDelayMs(aircraft = "", random = Math.random) {
  const type = String(aircraft).toUpperCase();
  let minimum = 12000;
  let maximum = 22000;

  if (/MQ-?9|REAPER/.test(type)) {
    minimum = 24000;
    maximum = 40000;
  } else if (/APACHE|HELI|AH-?64|WILDCAT/.test(type)) {
    minimum = 18000;
    maximum = 32000;
  }

  return Math.round(minimum + random() * (maximum - minimum));
}
