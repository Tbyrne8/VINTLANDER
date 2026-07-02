const aircraftLibrary = {
  typhoon: {
    label: "Typhoon",
    numberAndType: "2 X TYPHOON",
    callsigns: ["PYTHON", "PANTHER", "HAMMER", "RAZOR"],
    ordnanceOptions: [
      "2 X PAVEWAY IV, GUN 120 ROUNDS",
      "4 X PAVEWAY IV, GUN 120 ROUNDS",
      "2 X BRIMSTONE, 2 X PAVEWAY IV, GUN 120 ROUNDS",
    ],
    capabilities: "TGP, IR POINTER, ISR, ROVER",
    altitudeOptions: ["10000 FT", "15000 FT", "20000 FT"],
    playtimeOptions: ["25 MINUTES", "30 MINUTES", "35 MINUTES"],
  },

  f16: {
    label: "F-16C",
    numberAndType: "2 X F-16C",
    callsigns: ["VIPER", "FALCON", "MACE", "HAWK"],
    ordnanceOptions: [
      "2 X GBU-12, 20MM",
      "2 X GBU-38, 20MM",
      "2 X AGM-65, 20MM",
    ],
    capabilities: "SNIPER POD, IR POINTER, ISR, ROVER",
    altitudeOptions: ["ANGELS 12", "ANGELS 16", "ANGELS 20"],
    playtimeOptions: ["25 MINUTES", "30 MINUTES", "40 MINUTES"],
  },

  f15e: {
    label: "F-15E Strike Eagle",
    numberAndType: "2 X F-15E",
    callsigns: ["DUDE", "TIGER", "BOLT", "RAIDER"],
    ordnanceOptions: [
      "2 X GBU-31, 2 X GBU-38, 20MM",
      "4 X GBU-38, 20MM",
      "2 X GBU-12, 2 X GBU-38, 20MM",
    ],
    capabilities: "SNIPER POD, IR POINTER, ISR, ROVER",
    altitudeOptions: ["ANGELS 16", "ANGELS 20", "ANGELS 24"],
    playtimeOptions: ["30 MINUTES", "40 MINUTES", "45 MINUTES"],
  },

  fa18: {
    label: "F/A-18E Super Hornet",
    numberAndType: "2 X F/A-18E",
    callsigns: ["JESTER", "MAVERICK", "RAVEN", "BULLET"],
    ordnanceOptions: [
      "2 X GBU-12, 20MM",
      "2 X GBU-38, 20MM",
      "2 X AGM-65, 2 X GBU-12, 20MM",
    ],
    capabilities: "ATFLIR, IR POINTER, ISR, ROVER",
    altitudeOptions: ["ANGELS 14", "ANGELS 18", "ANGELS 22"],
    playtimeOptions: ["25 MINUTES", "35 MINUTES", "45 MINUTES"],
  },

  a10: {
    label: "A-10C Thunderbolt II",
    numberAndType: "2 X A-10C",
    callsigns: ["HAWG", "SANDY", "BOAR", "WARDOG"],
    ordnanceOptions: [
      "2 X GBU-12, ROCKETS, 30MM",
      "2 X AGM-65, ROCKETS, 30MM",
      "4 X GBU-38, 30MM",
    ],
    capabilities: "LITENING POD, IR POINTER, ISR, ROVER",
    altitudeOptions: ["ANGELS 8", "ANGELS 12", "ANGELS 16"],
    playtimeOptions: ["35 MINUTES", "45 MINUTES", "60 MINUTES"],
  },

  f35: {
    label: "F-35A",
    numberAndType: "2 X F-35A",
    callsigns: ["VIPER", "DODGE", "CHAOS", "COLT"],
    ordnanceOptions: [
      "2 X GBU-32, INTERNAL GUN",
      "2 X GBU-12, INTERNAL GUN",
      "2 X SDB, INTERNAL GUN",
    ],
    capabilities: "EOTS, ISR, LINK, ROVER",
    altitudeOptions: ["ANGELS 15", "ANGELS 20", "ANGELS 25"],
    playtimeOptions: ["25 MINUTES", "30 MINUTES", "40 MINUTES"],
  },

  f35b: {
    label: "F-35B Lightning",
    numberAndType: "2 X F-35B",
    callsigns: ["LIGHTNING", "DAGGER", "KNIGHT", "JAVELIN"],
    ordnanceOptions: [
      "2 X PAVEWAY IV, INTERNAL GUN",
      "2 X SPEAR, INTERNAL GUN",
      "2 X GBU-12, INTERNAL GUN",
    ],
    capabilities: "EOTS, ISR, LINK, ROVER",
    altitudeOptions: ["15000 FT", "20000 FT", "25000 FT"],
    playtimeOptions: ["25 MINUTES", "30 MINUTES", "40 MINUTES"],
  },

  rafale: {
    label: "Rafale",
    numberAndType: "2 X RAFALE",
    callsigns: ["MIRAGE", "RAFALE", "RAPIER", "LANCER"],
    ordnanceOptions: [
      "2 X AASM, 30MM",
      "2 X GBU-12, 30MM",
      "2 X GBU-49, 30MM",
    ],
    capabilities: "DAMOCLES POD, IR POINTER, ISR, ROVER",
    altitudeOptions: ["14000 FT", "18000 FT", "22000 FT"],
    playtimeOptions: ["25 MINUTES", "35 MINUTES", "45 MINUTES"],
  },

  gripen: {
    label: "Gripen",
    numberAndType: "2 X GRIPEN",
    callsigns: ["VIKING", "NORDIC", "ARROW", "SPEAR"],
    ordnanceOptions: [
      "2 X GBU-12, 27MM",
      "2 X GBU-49, 27MM",
      "2 X MAVERICK, 27MM",
    ],
    capabilities: "TARGETING POD, IR POINTER, ISR, ROVER",
    altitudeOptions: ["12000 FT", "16000 FT", "20000 FT"],
    playtimeOptions: ["25 MINUTES", "30 MINUTES", "40 MINUTES"],
  },

  tornado: {
    label: "Tornado IDS",
    numberAndType: "2 X TORNADO",
    callsigns: ["TORNADO", "STRIKER", "JAGUAR", "LION"],
    ordnanceOptions: [
      "2 X GBU-24, 27MM",
      "2 X GBU-16, 27MM",
      "4 X GBU-54, 27MM",
    ],
    capabilities: "LITENING POD, IR POINTER, ISR, ROVER",
    altitudeOptions: ["10000 FT", "14000 FT", "18000 FT"],
    playtimeOptions: ["25 MINUTES", "35 MINUTES", "45 MINUTES"],
  },

  harrier: {
    label: "AV-8B Harrier II",
    numberAndType: "2 X AV-8B",
    callsigns: ["JUMPJET", "HARRIER", "STORM", "VADER"],
    ordnanceOptions: [
      "2 X GBU-12, 25MM",
      "2 X AGM-65, 25MM",
      "ROCKETS, 25MM",
    ],
    capabilities: "LITENING POD, IR POINTER, ISR, ROVER",
    altitudeOptions: ["8000 FT", "12000 FT", "16000 FT"],
    playtimeOptions: ["20 MINUTES", "30 MINUTES", "35 MINUTES"],
  },

  apache: {
    label: "Apache AH-64E",
    numberAndType: "2 X APACHE",
    callsigns: ["UGLY", "VIPER", "GUNMAN", "REAPER"],
    ordnanceOptions: [
      "HELLFIRE, ROCKETS, 30MM",
      "ROCKETS, 30MM",
      "HELLFIRE, 30MM",
    ],
    capabilities: "TADS, IR, LASER, ISR",
    altitudeOptions: ["LOW LEVEL", "500 FT", "1000 FT"],
    playtimeOptions: ["20 MINUTES", "25 MINUTES", "30 MINUTES"],
  },

  tiger: {
    label: "Tiger HAD",
    numberAndType: "2 X TIGER",
    callsigns: ["TIGER", "PANTHER", "SCOUT", "LANCE"],
    ordnanceOptions: [
      "HELLFIRE, ROCKETS, 30MM",
      "ROCKETS, 30MM",
      "SPIKE, ROCKETS, 30MM",
    ],
    capabilities: "EO/IR, LASER, ISR",
    altitudeOptions: ["LOW LEVEL", "500 FT", "1000 FT"],
    playtimeOptions: ["20 MINUTES", "25 MINUTES", "30 MINUTES"],
  },

  cobra: {
    label: "AH-1Z Viper",
    numberAndType: "2 X AH-1Z",
    callsigns: ["VENOM", "COBRA", "SNAKE", "GUNFIGHTER"],
    ordnanceOptions: [
      "HELLFIRE, ROCKETS, 20MM",
      "ROCKETS, 20MM",
      "HELLFIRE, 20MM",
    ],
    capabilities: "EO/IR, LASER, ISR",
    altitudeOptions: ["LOW LEVEL", "500 FT", "1000 FT"],
    playtimeOptions: ["20 MINUTES", "25 MINUTES", "30 MINUTES"],
  },

  mq9: {
    label: "MQ-9 Reaper",
    numberAndType: "1 X MQ-9",
    callsigns: ["REAPER", "SABRE", "HUNTER", "PRED"],
    ordnanceOptions: [
      "2 X HELLFIRE, 2 X GBU-12",
      "4 X HELLFIRE",
      "2 X GBU-12",
    ],
    capabilities: "FMV, IR, LASER, ISR, ROVER",
    altitudeOptions: ["ANGELS 18", "ANGELS 20", "ANGELS 22"],
    playtimeOptions: ["4 HOURS", "5 HOURS", "6 HOURS"],
  },

  watchkeeper: {
    label: "Watchkeeper",
    numberAndType: "1 X WATCHKEEPER",
    callsigns: ["WATCHER", "SABRE", "LOOKOUT", "SENTRY"],
    ordnanceOptions: ["UNARMED ISR", "UNARMED FMV", "UNARMED LASER DESIGNATOR"],
    capabilities: "FMV, IR, LASER, ISR, ROVER",
    altitudeOptions: ["8000 FT", "10000 FT", "12000 FT"],
    playtimeOptions: ["4 HOURS", "5 HOURS", "6 HOURS"],
  },

  ac130: {
    label: "AC-130J Ghostrider",
    numberAndType: "1 X AC-130J",
    callsigns: ["SPOOKY", "GHOST", "GUNSHIP", "SHADOW"],
    ordnanceOptions: [
      "30MM, 105MM",
      "30MM, PRECISION GUIDED MUNITIONS",
      "105MM, PRECISION GUIDED MUNITIONS",
    ],
    capabilities: "FMV, IR, LASER, ISR, ROVER",
    altitudeOptions: ["ANGELS 10", "ANGELS 14", "ANGELS 18"],
    playtimeOptions: ["60 MINUTES", "90 MINUTES", "120 MINUTES"],
  },
};

const directions = ["NORTH", "SOUTH", "EAST", "WEST"];
const abortCodes = ["CHARLIE HOTEL", "BRAVO LIMA", "ALPHA ROMEO", "DELTA MIKE"];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomLetters(length) {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";

  return Array.from({ length }, () => letters[randomNumber(0, letters.length - 1)]).join("");
}

function randomMissionNumber() {
  const letterCount = randomNumber(2, 3);
  const digitCount = randomNumber(3, 5);
  const min = 10 ** (digitCount - 1);
  const max = 10 ** digitCount - 1;

  return `MISSION ${randomLetters(letterCount)}${randomNumber(min, max)}`;
}

function randomDownlink() {
  return String(randomNumber(1000, 9999));
}

function digitsToWords(code) {
  const words = {
    0: "ZERO",
    1: "ONE",
    2: "TWO",
    3: "THREE",
    4: "FOUR",
    5: "FIVE",
    6: "SIX",
    7: "SEVEN",
    8: "EIGHT",
    9: "NINER",
  };

  return code
    .split("")
    .map((digit) => words[digit])
    .join(" ");
}

function lettersToPhonetics(value = "") {
  const words = {
    A: "ALPHA",
    B: "BRAVO",
    C: "CHARLIE",
    D: "DELTA",
    E: "ECHO",
    F: "FOXTROT",
    G: "GOLF",
    H: "HOTEL",
    I: "INDIA",
    J: "JULIETT",
    K: "KILO",
    L: "LIMA",
    M: "MIKE",
    N: "NOVEMBER",
    O: "OSCAR",
    P: "PAPA",
    Q: "QUEBEC",
    R: "ROMEO",
    S: "SIERRA",
    T: "TANGO",
    U: "UNIFORM",
    V: "VICTOR",
    W: "WHISKEY",
    X: "XRAY",
    Y: "YANKEE",
    Z: "ZULU",
  };

  return value
    .split("")
    .map((character) => words[character] || character)
    .join(" ");
}

function formatMissionNumberForVoice(missionNumber) {
  return missionNumber.replace(
    /MISSION\s*([A-Z]+)(\d+)/,
    (_, letters, digits) =>
      `MISSION ${lettersToPhonetics(letters)} ${digitsToWords(digits)}`
  );
}

export function getAircraftOptions() {
  return Object.entries(aircraftLibrary).map(([id, aircraft]) => ({
    id,
    label: aircraft.label,
  }));
}

export function getCheckInLibrary(aircraftId = "typhoon") {
  const aircraft = aircraftLibrary[aircraftId] || aircraftLibrary.typhoon;

  return {
    ...aircraft,
    directions,
    abortCodes,
  };
}

export function generateCheckIn(selectedAircraftId = "random", options = {}) {
  const availableAircraft = Object.keys(aircraftLibrary);
  const aircraftId =
    selectedAircraftId === "random" ? pick(availableAircraft) : selectedAircraftId;

  const aircraft = aircraftLibrary[aircraftId] || aircraftLibrary.typhoon;

  const callsign =
    options.callsign || `${pick(aircraft.callsigns)} ${randomNumber(11, 99)}`;
  const missionNumber = options.missionNumber || randomMissionNumber();
  const controllerCallsign = options.controllerCallsign || "VINTAGE 10";
  const direction = options.direction || pick(directions);
  const altitude = options.altitude || pick(aircraft.altitudeOptions);
  const playtime = options.playtime || pick(aircraft.playtimeOptions);
  const ordnance = options.ordnance || pick(aircraft.ordnanceOptions);
  const downlinkCode = options.downlinkCode || randomDownlink();
  const abortCode = options.abortCode || pick(abortCodes);
  const missionNumberVoice = formatMissionNumberForVoice(missionNumber);

  const correctCheckIn = {
    aircraftCallsign: callsign,
    missionNumber,
    aircraftNumberType: aircraft.numberAndType,
    positionAltitude: `HOLDING ${direction}, ${altitude}`,
    ordnance,
    playtime,
    capabilities: aircraft.capabilities,
    downlinkCode,
    abortCode,
    remarks: "NO FURTHER REMARKS",
  };

  const transmissions = [
    {
      title: "TRANSMISSION 1 / 4 - AIRCRAFT",
      lines: [
        `${controllerCallsign}.`,
        `THIS IS ${callsign}.`,
        `${missionNumber}.`,
        `${aircraft.numberAndType}.`,
      ],
      voiceLines: [
        `${controllerCallsign}.`,
        `THIS IS ${callsign}.`,
        `${missionNumberVoice}.`,
        `${aircraft.numberAndType}.`,
      ],
    },
    {
      title: "TRANSMISSION 2 / 4 - POSITION",
      lines: [
        `CURRENTLY HOLDING ${direction}.`,
        altitude.includes("ANGELS") ? altitude + "." : `ALTITUDE ${altitude}.`,
        `PLAYTIME ${playtime}.`,
      ],
    },
    {
      title: "TRANSMISSION 3 / 4 - AIRCRAFT CAPABILITY",
      lines: [
        `${ordnance}.`,
        `${aircraft.capabilities}.`,
        `DOWNLINK ${digitsToWords(downlinkCode)}.`,
      ],
    },
    {
      title: "TRANSMISSION 4 / 4 - ADMINISTRATION",
      lines: [`ABORT CODE ${abortCode}.`, "NO FURTHER REMARKS."],
    },
  ];

  return {
    aircraftId,
    aircraftLabel: aircraft.label,
    correctCheckIn,
    transmissions,
  };
}
