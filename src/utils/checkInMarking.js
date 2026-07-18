function normalise(value) {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function wordsToDigits(value) {
  return value
    .replace(/\bZERO\b/g, "0")
    .replace(/\bONE\b/g, "1")
    .replace(/\bTWO\b/g, "2")
    .replace(/\bTHREE\b/g, "3")
    .replace(/\bFOUR\b/g, "4")
    .replace(/\bFIVE\b/g, "5")
    .replace(/\bSIX\b/g, "6")
    .replace(/\bSEVEN\b/g, "7")
    .replace(/\bEIGHT\b/g, "8")
    .replace(/\bNINER\b/g, "9")
    .replace(/\bNINE\b/g, "9");
}

function numbersOnly(value) {
  return wordsToDigits(value).replace(/[^0-9]/g, "");
}

function lettersToInitials(value) {
  const phonetics = {
    ALPHA: "A",
    BRAVO: "B",
    CHARLIE: "C",
    DELTA: "D",
    ECHO: "E",
    FOXTROT: "F",
    GOLF: "G",
    HOTEL: "H",
    INDIA: "I",
    JULIETT: "J",
    JULIET: "J",
    KILO: "K",
    LIMA: "L",
    MIKE: "M",
    NOVEMBER: "N",
    OSCAR: "O",
    PAPA: "P",
    QUEBEC: "Q",
    ROMEO: "R",
    SIERRA: "S",
    TANGO: "T",
    UNIFORM: "U",
    VICTOR: "V",
    WHISKEY: "W",
    XRAY: "X",
    "X-RAY": "X",
    YANKEE: "Y",
    ZULU: "Z",
  };

  return tokens(value)
    .map((word) => phonetics[word] || word)
    .join("");
}

function normaliseMissionNumber(value) {
  return lettersToInitials(value)
    .replace(/^MISSION/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function tokens(value) {
  return normalise(value).split(/[ ,./()-]+/).filter(Boolean);
}

function extractDirection(value) {
  const userTokens = tokens(value);

  if (userTokens.includes("N") || value.includes("NORTH")) return "NORTH";
  if (userTokens.includes("S") || value.includes("SOUTH")) return "SOUTH";
  if (userTokens.includes("E") || value.includes("EAST")) return "EAST";
  if (userTokens.includes("W") || value.includes("WEST")) return "WEST";

  return null;
}

function extractAltitude(value) {
  const converted = wordsToDigits(normalise(value));
  const compact = converted.replace(/[ ,.-]/g, "");

  if (compact.includes("LOWLEVEL")) return "LOW LEVEL";

  const angels = compact.match(/(?:ANGELS?|A)(\d{1,2})(?!\d)/);
  if (angels) return String(Number(angels[1]) * 1000);

  const feet = compact.match(/(\d{3,5})(?:FT|FEET|FOOT)?/);
  if (feet) return String(Number(feet[1]));

  return null;
}

function positionMatches(userValue, correctValue) {
  const user = normalise(userValue);
  const correct = normalise(correctValue);
  const correctDirection = extractDirection(correct);

  if (correctDirection) return extractDirection(user) === correctDirection;

  const correctPosition = correct.split(",")[0];
  const positionWords = tokens(correctPosition).filter(
    (word) =>
      ![
        "CURRENTLY",
        "HOLDING",
        "ESTABLISHED",
        "IN",
        "ROUTING",
        "TO",
        "REQUESTING",
        "CLEARANCE",
      ].includes(word)
  );

  return positionWords.length > 0 && positionWords.every((word) => user.includes(word));
}

function hasAllImportantWords(userValue, correctValue) {
  const user = wordsToDigits(normalise(userValue));
  const correct = wordsToDigits(normalise(correctValue));

  if (correct.includes("GUN") && !user.includes("GUN")) {
    return false;
  }

  const importantWords = tokens(correctValue).filter(
    (word) =>
      ![
        "X",
        "AND",
        "THE",
        "A",
        "AN",
        "AVAILABLE",
        "ROUNDS",
        "ROUND",
        "INTERNAL",
        "GUN",
      ].includes(word)
  );

  return importantWords.every((word) => user.includes(word));
}

export function markCheckInField(field, userValue, correctValue) {
  const user = normalise(userValue);
  const correct = normalise(correctValue);

  if (field === "downlinkCode") {
    return numbersOnly(user) === numbersOnly(correct);
  }

  if (field === "missionNumber") {
    return normaliseMissionNumber(user) === normaliseMissionNumber(correct);
  }

if (field === "aircraftNumberType") {
  const correctNumber = numbersOnly(correct);
  const numberedUser = wordsToDigits(user);

  const typeWords = tokens(correct).filter(
    (word) => !["1", "2", "X"].includes(word)
  );

  const typeMatches = typeWords.every((word) => numberedUser.includes(word));

  // If it is only 1 aircraft, accepting just the aircraft type is okay
  if (correctNumber.startsWith("1") && typeMatches) {
    return true;
  }

  const numberMatches =
    numberedUser.includes(correctNumber[0]);

  return numberMatches && typeMatches;
}

  if (field === "positionAltitude") {
    const userAltitude = extractAltitude(user);
    const correctAltitude = extractAltitude(correct);

    return (
      positionMatches(user, correct) &&
      userAltitude !== null &&
      userAltitude === correctAltitude
    );
  }

  if (field === "playtime") {
    return numbersOnly(user) === numbersOnly(correct);
  }

  if (field === "ordnance") {
    const userClean = user
      .replace(/PAVEWAY 4/g, "PAVEWAY IV")
      .replace(/PWIV/g, "PAVEWAY IV")
      .replace(/30 MM/g, "30MM")
      .replace(/30-MIL/g, "30MM");

    const correctClean = correct
      .replace(/PAVEWAY 4/g, "PAVEWAY IV")
      .replace(/PWIV/g, "PAVEWAY IV")
      .replace(/30 MM/g, "30MM")
      .replace(/30-MIL/g, "30MM");

    return hasAllImportantWords(userClean, correctClean);
  }

  if (field === "capabilities") {
    const correctCaps = tokens(correct).filter(
      (word) => !["AVAILABLE"].includes(word)
    );

    return correctCaps.every((capability) => user.includes(capability));
  }

 if (field === "remarks") {
  if (correct === "NO FURTHER REMARKS") {
    return (
      user === "NO FURTHER REMARKS" ||
      user === "NO REMARKS" ||
      user === "NIL REMARKS" ||
      user === "NONE" ||
      user === "NIL" ||
      user === "NO"
    );
  }

  return user === correct;
}
if (field === "abortCode") {
  return lettersToInitials(user) === lettersToInitials(correct);
}
  return user === correct;
}
