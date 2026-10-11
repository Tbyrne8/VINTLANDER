const ipNames = [
  "NORTH",
  "ALPHA",
  "EAST",
  "BRAVO",
  "SOUTH",
  "CHARLIE",
  "WEST",
  "DELTA",
  "NORTHEAST",
  "ECHO",
  "SOUTHEAST",
  "FOXTROT",
  "SOUTHWEST",
  "GOLF",
  "NORTHWEST",
  "HOTEL",
];

const bpThemes = [
  ["COBRA", "VIPER", "ADDER", "MAMBA", "PYTHON", "ASP"],
  ["FALCON", "HAWK", "EAGLE", "RAVEN", "KESTREL", "OSPREY"],
  ["BADGER", "LYNX", "FERRET", "FOX", "OTTER", "WOLF"],
  ["SABRE", "DAGGER", "MACE", "SWORD", "LANCE", "JAVELIN"],
  ["RIDGE", "VALLEY", "HILL", "WOOD", "MARSH", "CLIFF"],
  ["HOMER", "MARGE", "BART", "LISA", "MAGGIE", "MOE"],
  ["GUINNESS", "STELLA", "PERONI", "CARLING", "HEINEKEN", "CORONA"],
  ["FORD", "AUDI", "BMW", "JAGUAR", "VOLVO", "LOTUS"],
  ["COKE", "PEPSI", "FANTA", "SPRITE", "TANGO", "IRNBRU"],
];

const haNames = [
  "SHIELD",
  "HAVEN",
  "FORTRESS",
  "BASTION",
  "CITADEL",
  "SANCTUARY",
  "RAMPART",
  "KEEP",
];

const namePools = { ip: ipNames, ha: haNames };

export function getNextControlPointName(type, controlPoints = []) {
  const normalisedType = String(type || "ip").toLowerCase();
  const usedNames = new Set(
    controlPoints
      .filter((point) => point.type === normalisedType)
      .map((point) => stripTypePrefix(point.name, normalisedType))
  );
  const pool =
    normalisedType === "bp"
      ? getBpTheme(controlPoints, usedNames)
      : namePools[normalisedType] || namePools.ip;
  const availableName = pool.find((name) => !usedNames.has(name));

  if (availableName) return availableName;

  return `${pool[usedNames.size % pool.length]} ${
    Math.floor(usedNames.size / pool.length) + 2
  }`;
}

function getBpTheme(controlPoints, usedNames) {
  const matchedTheme = bpThemes
    .map((theme) => ({
      theme,
      matches: theme.filter((name) => usedNames.has(name)).length,
    }))
    .sort((left, right) => right.matches - left.matches)[0];

  if (matchedTheme.matches > 0) return matchedTheme.theme;

  const seed = controlPoints.reduce((total, point) => {
    const positionSeed = point.position
      ? Math.round(Math.abs(point.position.lat * 10000 + point.position.lng * 10000))
      : 0;
    const nameSeed = String(point.name || point.id || "")
      .split("")
      .reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return total + positionSeed + nameSeed;
  }, 0);

  return bpThemes[seed % bpThemes.length];
}

function stripTypePrefix(name, type) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(new RegExp(`^${type.toUpperCase()}\\s+`), "");
}
