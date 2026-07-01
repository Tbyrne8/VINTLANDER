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

export function getAircraftOptions() {
  return Object.entries(aircraftLibrary).map(([id, aircraft]) => ({
    id,
    label: aircraft.label,
  }));
}

export function generateCheckIn(selectedAircraftId = "random", options = {}) {
  const availableAircraft = Object.keys(aircraftLibrary);
  const aircraftId =
    selectedAircraftId === "random" ? pick(availableAircraft) : selectedAircraftId;

  const aircraft = aircraftLibrary[aircraftId] || aircraftLibrary.typhoon;

  const callsign = `${pick(aircraft.callsigns)} ${randomNumber(11, 99)}`;
  const missionNumber = randomMissionNumber();
  const controllerCallsign = options.controllerCallsign || "VINTAGE 10";
  const direction = pick(directions);
  const altitude = pick(aircraft.altitudeOptions);
  const playtime = pick(aircraft.playtimeOptions);
  const ordnance = pick(aircraft.ordnanceOptions);
  const downlinkCode = randomDownlink();
  const abortCode = pick(abortCodes);

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
