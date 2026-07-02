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

function containsAny(value, options) {
  return options.some((option) => value.includes(option));
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
  const compact = value.replace(/\s/g, "");

  if (compact.includes("ANGELS10") || compact.includes("A10") || compact.includes("10000")) return "10";
  if (compact.includes("ANGELS15") || compact.includes("A15") || compact.includes("15000")) return "15";
  if (compact.includes("ANGELS18") || compact.includes("A18") || compact.includes("18000")) return "18";
  if (compact.includes("ANGELS20") || compact.includes("A20") || compact.includes("20000")) return "20";
  if (compact.includes("ANGELS22") || compact.includes("A22") || compact.includes("22000")) return "22";
  if (compact.includes("ANGELS25") || compact.includes("A25") || compact.includes("25000")) return "25";

  if (compact.includes("LOWLEVEL")) return "LOW LEVEL";
  if (compact.includes("500FT") || compact === "500") return "500 FT";
  if (compact.includes("1000FT") || compact === "1000") return "1000 FT";

  return null;
}

function hasAllImportantWords(userValue, correctValue) {
  const user = normalise(userValue);
  const correct = normalise(correctValue);

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

  const typeWords = tokens(correct).filter(
    (word) => !["1", "2", "X"].includes(word)
  );

  const typeMatches = typeWords.every((word) => user.includes(word));

  // If it is only 1 aircraft, accepting just the aircraft type is okay
  if (correctNumber.startsWith("1") && typeMatches) {
    return true;
  }

  const numberMatches =
    user.includes(correctNumber[0]) ||
    (correct.includes("2") && user.includes("TWO")) ||
    (correct.includes("1") && user.includes("ONE"));

  return numberMatches && typeMatches;
}

  if (field === "positionAltitude") {
    const userDirection = extractDirection(user);
    const correctDirection = extractDirection(correct);

    const userAltitude = extractAltitude(user);
    const correctAltitude = extractAltitude(correct);

    return userDirection === correctDirection && userAltitude === correctAltitude;
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
  const userLetters = user
    .split(/[ ,./()-]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");

  const correctLetters = correct
    .split(/[ ,./()-]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("");

  return user === correct || userLetters === correctLetters;
}
  return user === correct;
}
