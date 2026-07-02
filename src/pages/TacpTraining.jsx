import { useEffect, useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import * as mgrs from "mgrs";
import { formatMgrs, parseMgrs } from "../utils/mgrs.js";
import {
  generateCheckIn,
  getAircraftOptions,
  getCheckInLibrary,
} from "../utils/checkInGenerator.js";
import TargetMarkers from "../components/TargetMarkers.jsx";
import ObserverMarker from "../components/ObserverMarker.jsx";
import ControlPointMarkers from "../components/ControlPointMarkers.jsx";

const savedTrainingLogs = "vintlander.trainingLogs";
const savedCallsigns = "vintlander.controllerCallsigns";
const savedTargets = "vintlander.targets";
const savedObserverPosition = "vintlander.observerPosition";
const savedIntelInjects = "vintlander.intelInjects";
const savedTargetStatus = "vintlander.targetDevelopmentStatus";
const savedAttackBriefs = "vintlander.attackBriefs";
const savedAttackStatus = "vintlander.attackStatus";
const savedPendingCheckIn = "vintlander.pendingCheckIn";
const savedControlPoints = "vintlander.controlPoints";
const savedOpHistory = "vintlander.opHistory";
const savedMapCenter = "vintlander.mapCenter";
const defaultMapPosition = { lat: 51.38466954999258, lng: -2.3747654912984433 };
const heightBlockOptions = Array.from({ length: 30 }, (_, index) => {
  const feet = (index + 1) * 1000;
  return `${feet} FT`;
});

const serialPhases = [
  {
    id: "situation",
    title: "Situation Update",
    tasks: [
      "Initial ground picture received from DS",
      "Ground picture, threats and boundaries understood",
      "Restrictions and abort code briefed",
    ],
  },
  {
    id: "checkin",
    title: "Aircraft Check-In",
    tasks: [
      "Aircraft callsign, mission number and type captured",
      "Position, altitude and playtime understood",
      "Ordnance, sensors and downlink confirmed",
    ],
  },
  {
    id: "targeting",
    title: "Target Development",
    tasks: [
      "Target area searched or tasked by intel",
      "Target position/designation created on the map",
      "Threats, restrictions and abort code briefed",
    ],
  },
  {
    id: "talkon",
    title: "Talk-On / Sensors",
    tasks: [
      "ISR/downlink used to confirm target area",
      "Mark, correlation or final attack heading agreed",
      "Target track or sensor point maintained",
    ],
  },
  {
    id: "attack",
    title: "9-Line / Control",
    tasks: [
      "9-Line passed cleanly",
      "Readback confirmed",
      "Clearance, abort criteria and egress understood",
    ],
  },
  {
    id: "effects",
    title: "Effects / BDA",
    tasks: [
      "Effects observed or requested from platform",
      "Re-attack, shift, cease or check-fire decision made",
      "Serial closed and platform status updated",
    ],
  },
];

const defaultController = {
  callsign: "VINTAGE 10",
  serialType: "CAS serial",
  objective: "Train complete check-in to effects workflow",
  friendlies:
    "Exercising troop to establish an OP and mark own location on the map after the situation update.",
  threats: "MANPADS possible. Small arms likely.",
  restrictions: "No fire north of target. Confirm PID before clearance.",
  situationUpdate:
    "Initial ground picture pending. DS to build and push the situation update before aircraft check-in.",
  targetDevelopment:
    "Use the map trainer and ISR feed to find, mark or receive the target before progressing to talk-on.",
  opTasking:
    "OP not pushed. DS can set the OP or direct the troop to plot it on the map.",
  abortCode: "CHARLIE HOTEL",
  bda: "",
};

const situationOptions = {
  friendlyPosture: [
    "Exercising troop moving to establish an OP.",
    "Exercising troop static in a hide, OP not yet confirmed.",
    "Exercising troop mounted and preparing to dismount.",
  ],
  enemyActivity: [
    "Enemy pair reported.",
    "Enemy fire team reported.",
    "Enemy section-sized element reported.",
    "Enemy platoon-sized element reported.",
    "Enemy group with small arms only.",
    "Enemy group with RPG reported.",
    "Enemy group with GPMG reported.",
    "Enemy group with HMG reported.",
    "Enemy group with MANPADS possible.",
    "Enemy group with mortar capability possible.",
    "Enemy technical vehicle reported.",
    "Enemy armoured vehicle reported.",
    "Enemy command element suspected.",
    "Enemy resupply element suspected.",
    "Enemy observation element suspected.",
  ],
  civilianPattern: [
    "Civilians possible on the main road.",
    "No civilian pattern reported.",
    "Civilian compound nearby, confirm PID before clearance.",
  ],
  controlMeasure: [
    "No fire north of target area.",
    "No fire within 300m of the road.",
    "Final attack heading to avoid friendlies once OP is plotted.",
  ],
  threatType: [
    "MANPADS possible.",
    "Small arms likely.",
    "Heavy machine gun reported.",
    "Mortar threat possible.",
    "No confirmed air defence threat.",
  ],
  restrictionType: [
    "Confirm PID before clearance.",
    "No fire within 300m of any compound.",
    "No fire north of the phase line.",
    "Check fire if civilians enter the target area.",
    "Final attack heading to be confirmed after OP is plotted.",
  ],
};

const targetInjectTypes = [
  {
    id: "exact",
    label: "Push exact target",
    template:
      "Exact target passed by DS. Plot the grid, confirm target description, then prepare talk-on.",
  },
  {
    id: "vague",
    label: "Push vague intel",
    template:
      "Intel indicates enemy activity in the area. Use map study and ISR to narrow, plot and confirm.",
  },
  {
    id: "suspected",
    label: "Push suspected area",
    template:
      "Suspected target area only. Search the area, designate likely target location and await correlation.",
  },
  {
    id: "moving",
    label: "Push moving target report",
    template:
      "Moving target report. Track likely movement, update plotted position and maintain correlation.",
  },
];

const targetStatuses = [
  "Intel received",
  "OP plotted",
  "Target plotted",
  "Target correlated",
  "Target confirmed",
];

const attackStatuses = [
  "9-Line prepared",
  "9-Line passed",
  "Readback correct",
  "Cleared hot",
  "Abort",
  "Dry / no drop",
  "Effects observed",
  "Re-attack required",
];

const defaultAttackStatus = {
  phase: "Attack pending",
  clearance: "Not cleared",
  bda: "No BDA received.",
  linkedBriefId: "",
  effect: "Unknown",
  reattack: "Not assessed",
  attackRunStartedAt: null,
  attackRunDurationMs: 90000,
  bdaAvailableAt: null,
  bdaDelayMs: 45000,
};

const defaultAttackBrief = {
  controlType: "TYPE 2",
  attackMethod: "BOT",
  ipBp: "CURRENT HOLD",
  heading: "AS REQUIRED",
  distance: "AS REQUIRED",
  elevation: "UNKNOWN",
  mark: "TALK-ON",
  friendlies: "UNKNOWN",
  egress: "AS DIRECTED",
  restrictions: "CLEARED HOT ON CONTROL ONLY",
  remarks: "",
};

const checkInDeliveryOptions = [
  { id: "generatedText", label: "Generated text" },
  { id: "generatedRadio", label: "Generated radio voice" },
  { id: "dsVoice", label: "DS local voice" },
];

function loadSavedList(key) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getTimestamp() {
  return new Date().toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTaskKey(phaseId, taskIndex) {
  return `${phaseId}-${taskIndex}`;
}

function getDefaultCallsigns() {
  return ["VINTAGE 10", "VINTAGE 11", "CHAOS 20", "WIDOW 30"];
}

function getTargetDescription(target) {
  if (!target) return "NO TARGET SELECTED";
  return [target.type, target.description].filter(Boolean).join(" - ");
}

function buildNineLine(brief, target) {
  return [
    ["1", "IP/BP", brief.ipBp],
    ["2", "Heading", brief.heading],
    ["3", "Distance", brief.distance],
    ["4", "Target elevation", brief.elevation],
    ["5", "Target description", getTargetDescription(target)],
    ["6", "Target location", target ? formatMgrs(target.position) : "NO GRID SAVED"],
    ["7", "Mark", brief.mark],
    ["8", "Friendlies", brief.friendlies],
    ["9", "Egress", brief.egress],
  ];
}

function loadSavedValue(key, fallback = null) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function formatPlatformAltitude(positionAltitude = "") {
  return positionAltitude.replace(/ANGELS\s*(\d+)/gi, (_, angels) => {
    return `${Number(angels) * 1000} FT`;
  });
}

function getPlaytimeMinutes(playtime = "") {
  const hoursMatch = playtime.match(/(\d+)\s*HOURS?/i);
  const minutesMatch = playtime.match(/(\d+)\s*MINUTES?/i);

  if (hoursMatch) return Number(hoursMatch[1]) * 60;
  if (minutesMatch) return Number(minutesMatch[1]);
  return null;
}

function formatPlaytime(platform) {
  const baseMinutes = getPlaytimeMinutes(platform.playtime);
  const totalMinutes =
    baseMinutes === null ? null : baseMinutes + (platform.extraPlaytimeMinutes || 0);

  if (!platform.checkedInAt || totalMinutes === null) {
    if (platform.extraPlaytimeMinutes) {
      return `PLUS ${platform.extraPlaytimeMinutes} MIN / NOT CHECKED IN`;
    }

    return platform.playtime || "UNKNOWN";
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(platform.checkedInAt).getTime()) / 60000)
  );
  const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);

  return `${remainingMinutes} MIN REM / ${platform.playtime}`;
}

function getRemainingPlaytimeMinutes(platform) {
  const baseMinutes = getPlaytimeMinutes(platform.playtime);
  const totalMinutes =
    baseMinutes === null ? null : baseMinutes + (platform.extraPlaytimeMinutes || 0);

  if (!platform.checkedInAt || totalMinutes === null) return null;

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(platform.checkedInAt).getTime()) / 60000)
  );

  return Math.max(0, totalMinutes - elapsedMinutes);
}

function getPlaytimeClass(platform) {
  const remainingMinutes = getRemainingPlaytimeMinutes(platform);

  if (remainingMinutes === null) return "";
  if (remainingMinutes <= 5) return "timeCritical";
  if (remainingMinutes <= 10) return "timeWarning";

  return "";
}

function formatCheckInTime(checkedInAt) {
  if (!checkedInAt) return "UNKNOWN";

  return new Date(checkedInAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatControlPointLabel(point) {
  const type = (point.type || "ip").toUpperCase();
  const rawName = String(point.name || "").trim().toUpperCase();

  if (rawName.startsWith(`${type} `)) return rawName;

  return `${type} ${rawName || "CONTROL"}`;
}

function getInboundStartPosition(routePosition) {
  return offsetPosition(routePosition, -42000, -22000);
}

function getControlPointRoleForAircraft(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (normalisedAircraft.includes("APACHE") || normalisedAircraft.includes("HELI")) {
    return "bp";
  }

  return "ip";
}

function getRouteableControlPoints(controlPoints, aircraft = "") {
  const preferredType = getControlPointRoleForAircraft(aircraft);
  const preferredPoints = controlPoints.filter((point) => point.type === preferredType);

  return preferredPoints.length > 0 ? preferredPoints : controlPoints;
}

function offsetPosition(center, eastMetres, northMetres) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos((center.lat * Math.PI) / 180);

  return {
    lat: center.lat + northMetres / metresPerDegreeLat,
    lng: center.lng + eastMetres / metresPerDegreeLng,
  };
}

export default function TacpTraining({
  platforms = [],
  setPlatforms = () => {},
  onNavigate = () => {},
  serialMode = false,
  serialVariant = "ds",
  onExitSerial = () => {},
}) {
  const [logs, setLogs] = useState(() => loadSavedList(savedTrainingLogs));
  const [targets, setTargets] = useState(() => loadSavedList(savedTargets));
  const [observerPosition, setObserverPosition] = useState(() =>
    loadSavedValue(savedObserverPosition)
  );
  const [intelInjects, setIntelInjects] = useState(() =>
    loadSavedList(savedIntelInjects)
  );
  const [attackBriefs, setAttackBriefs] = useState(() =>
    loadSavedList(savedAttackBriefs)
  );
  const [targetStatus, setTargetStatus] = useState(() =>
    loadSavedValue(savedTargetStatus, {
      phase: "Intel pending",
      notes: "No target development activity yet.",
    })
  );
  const [attackStatus, setAttackStatus] = useState(() =>
    loadSavedValue(savedAttackStatus, defaultAttackStatus)
  );
  const [pendingCheckIn, setPendingCheckIn] = useState(() =>
    loadSavedValue(savedPendingCheckIn)
  );
  const [controlPoints, setControlPoints] = useState(() =>
    loadSavedList(savedControlPoints)
  );
  const [opHistory, setOpHistory] = useState(() =>
    loadSavedList(savedOpHistory)
  );
  const [selectedAircraft, setSelectedAircraft] = useState("random");
  const [completedTasks, setCompletedTasks] = useState({});
  const [controller, setController] = useState(defaultController);
  const [debrief, setDebrief] = useState("");
  const [activeView, setActiveView] = useState("trainee");
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [selfSetupComplete, setSelfSetupComplete] = useState(
    serialVariant !== "self" ||
      Boolean(loadSavedValue(savedPendingCheckIn)) ||
      platforms.length > 0
  );
  const [selfSetup, setSelfSetup] = useState({
    callsign: defaultController.callsign,
    situationUpdate:
      "Exercising troop established for a self-led serial. Enemy activity reported in the training area.",
    friendlies: defaultController.friendlies,
    threats: defaultController.threats,
    restrictions: defaultController.restrictions,
    targetDevelopment:
      "Use map trainer and ISR to search, designate and confirm targets after check-in.",
    threatSelections: [defaultController.threats],
    opName: "OP 1",
    savedOpId: "",
    opGrid: "",
    controlPointGrid: "",
    controlPointType: "ip",
    controlPointName: "COD",
  });
  const [selfSetupControlPoints, setSelfSetupControlPoints] = useState([]);
  const [callsigns, setCallsigns] = useState(() => {
    const saved = loadSavedList(savedCallsigns);
    return saved.length ? saved : getDefaultCallsigns();
  });
  const [newCallsign, setNewCallsign] = useState("");
  const [opGrid, setOpGrid] = useState("");
  const [targetGrid, setTargetGrid] = useState("");
  const [controlPointGrid, setControlPointGrid] = useState("");
  const [controlPointType, setControlPointType] = useState("ip");
  const [controlPointName, setControlPointName] = useState("");
  const [targetType, setTargetType] = useState("enemy");
  const [targetDescription, setTargetDescription] = useState("");
  const [intelText, setIntelText] = useState("");
  const [targetInjectType, setTargetInjectType] = useState("vague");
  const [selectedAttackBriefId, setSelectedAttackBriefId] = useState("");
  const [selectedAttackPlatformId, setSelectedAttackPlatformId] = useState("");
  const [selectedAttackTargetId, setSelectedAttackTargetId] = useState("");
  const [attackBriefDraft, setAttackBriefDraft] = useState(defaultAttackBrief);
  const [attackReadbackState, setAttackReadbackState] = useState("Pending");
  const [checkInDeliveryMode, setCheckInDeliveryMode] = useState("generatedText");
  const [manualCheckIn, setManualCheckIn] = useState({
    callsign: "",
    missionNumber: "",
    direction: "NORTH",
    altitude: "",
    ordnance: "",
    playtime: "",
    downlinkCode: "",
    abortCode: "",
  });
  const [bdaEffect, setBdaEffect] = useState("Target effects unknown");
  const [bdaText, setBdaText] = useState("");
  const [reattackDecision, setReattackDecision] = useState("Await DS decision");
  const [attackClock, setAttackClock] = useState(Date.now());
  const [situationTemplate, setSituationTemplate] = useState({
    friendlyPosture: situationOptions.friendlyPosture[0],
    enemyActivity: situationOptions.enemyActivity[0],
    civilianPattern: situationOptions.civilianPattern[0],
    controlMeasure: situationOptions.controlMeasure[0],
    threatType: situationOptions.threatType[0],
    restrictionType: situationOptions.restrictionType[0],
  });

  useEffect(() => {
    window.localStorage.setItem(savedTrainingLogs, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    window.localStorage.setItem(savedTargets, JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    if (observerPosition) {
      window.localStorage.setItem(
        savedObserverPosition,
        JSON.stringify(observerPosition)
      );
      return;
    }

    window.localStorage.removeItem(savedObserverPosition);
  }, [observerPosition]);

  useEffect(() => {
    window.localStorage.setItem(savedIntelInjects, JSON.stringify(intelInjects));
  }, [intelInjects]);

  useEffect(() => {
    setAttackBriefs(loadSavedList(savedAttackBriefs));
  }, [activeView]);

  useEffect(() => {
    if (!selectedAttackPlatformId && platforms.length) {
      setSelectedAttackPlatformId(platforms[0].id);
    }
  }, [platforms, selectedAttackPlatformId]);

  useEffect(() => {
    if (!selectedAttackTargetId && targets.length) {
      setSelectedAttackTargetId(targets[0].id);
    }
  }, [targets, selectedAttackTargetId]);

  useEffect(() => {
    window.localStorage.setItem(savedAttackBriefs, JSON.stringify(attackBriefs));
  }, [attackBriefs]);

  useEffect(() => {
    window.localStorage.setItem(savedTargetStatus, JSON.stringify(targetStatus));
  }, [targetStatus]);

  useEffect(() => {
    window.localStorage.setItem(savedAttackStatus, JSON.stringify(attackStatus));
  }, [attackStatus]);

  useEffect(() => {
    if (!attackStatus.attackRunStartedAt && !attackStatus.bdaAvailableAt) {
      return undefined;
    }

    const timer = setInterval(() => setAttackClock(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [attackStatus.attackRunStartedAt, attackStatus.bdaAvailableAt]);

  useEffect(() => {
    if (pendingCheckIn) {
      window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(pendingCheckIn));
      return;
    }

    window.localStorage.removeItem(savedPendingCheckIn);
  }, [pendingCheckIn]);

  useEffect(() => {
    window.localStorage.setItem(savedControlPoints, JSON.stringify(controlPoints));
  }, [controlPoints]);

  useEffect(() => {
    window.localStorage.setItem(savedOpHistory, JSON.stringify(opHistory));
  }, [opHistory]);

  useEffect(() => {
    window.localStorage.setItem(savedCallsigns, JSON.stringify(callsigns));
  }, [callsigns]);

  useEffect(() => {
    if (serialVariant !== "self") {
      setSelfSetupComplete(true);
      return;
    }

    setSelfSetupComplete(
      (current) =>
        current ||
        Boolean(loadSavedValue(savedPendingCheckIn)) ||
        platforms.length > 0 ||
        Boolean(observerPosition)
    );
  }, [observerPosition, platforms.length, serialVariant]);

  const aircraftChoices = useMemo(
    () => [
      { id: "random", label: "Random aircraft" },
      ...getAircraftOptions().map((aircraft) => ({
        id: `type:${aircraft.id}`,
        label: aircraft.label,
      })),
    ],
    []
  );

  const selectedPlatform = platforms[0] || null;
  const aircraftRows = useMemo(() => {
    const pendingRows = pendingCheckIn
      ? [
          {
            id: pendingCheckIn.id,
            callsign: "PENDING",
            aircraft: pendingCheckIn.aircraftLabel,
            positionAltitude:
              pendingCheckIn.routeStatus || "AWAITING TROOP ROUTE",
            playtime: pendingCheckIn.playtime || "NOT CHECKED IN",
            checkedInAt: null,
            downlinkCode: "PENDING",
            capabilities: pendingCheckIn.deliveryLabel || "Pending check-in",
            status: pendingCheckIn.routedControlPoint
              ? "ROUTED / AWAITING CHECK-IN"
              : "AWAITING ROUTE",
            routeStatus: pendingCheckIn.routeStatus || "Awaiting troop route",
            extraPlaytimeMinutes: pendingCheckIn.extraPlaytimeMinutes || 0,
            isPending: true,
          },
        ]
      : [];

    return [...pendingRows, ...platforms];
  }, [pendingCheckIn, platforms]);
  const selectedAircraftLabel =
    aircraftChoices.find((aircraft) => aircraft.id === selectedAircraft)?.label ||
    "Random aircraft";
  const selectedAircraftId = selectedAircraft.replace("type:", "");
  const selectedCheckInLibrary = getCheckInLibrary(
    selectedAircraft === "random" ? "typhoon" : selectedAircraftId
  );
  const dsVoicePreview =
    checkInDeliveryMode === "dsVoice"
      ? generateCheckIn(
          selectedAircraft === "random" ? "typhoon" : selectedAircraftId,
          {
            controllerCallsign: controller.callsign,
            callsign: manualCheckIn.callsign || undefined,
            missionNumber: manualCheckIn.missionNumber || undefined,
            direction: manualCheckIn.direction,
            altitude: manualCheckIn.altitude || undefined,
            ordnance: manualCheckIn.ordnance || undefined,
            playtime: manualCheckIn.playtime || undefined,
            downlinkCode: manualCheckIn.downlinkCode || undefined,
            abortCode: manualCheckIn.abortCode || undefined,
          }
        )
      : null;

  const totalTasks = serialPhases.reduce(
    (sum, phase) => sum + phase.tasks.length,
    0
  );
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progress = Math.round((completedCount / totalTasks) * 100);
  const latestIntel = intelInjects[0];
  const mapCenter = observerPosition || targets[0]?.position || defaultMapPosition;
  const linkedAttackBrief = attackBriefs.find(
    (brief) => brief.id === attackStatus.linkedBriefId
  );
  const selectedAttackPlatform = platforms.find(
    (platform) => platform.id === selectedAttackPlatformId
  );
  const selectedAttackTarget = targets.find(
    (target) => target.id === selectedAttackTargetId
  );
  const attackNineLines = useMemo(
    () => buildNineLine(attackBriefDraft, selectedAttackTarget),
    [attackBriefDraft, selectedAttackTarget]
  );
  const attackRunEndsAt = attackStatus.attackRunStartedAt
    ? attackStatus.attackRunStartedAt + (attackStatus.attackRunDurationMs || 90000)
    : null;
  const attackRunRemainingMs = attackRunEndsAt
    ? Math.max(0, attackRunEndsAt - attackClock)
    : 0;
  const bdaRemainingMs = attackStatus.bdaAvailableAt
    ? Math.max(0, attackStatus.bdaAvailableAt - attackClock)
    : 0;
  const canSendBda =
    Boolean(attackStatus.bdaAvailableAt) && bdaRemainingMs === 0;

  function updateController(field, value) {
    setController((current) => ({ ...current, [field]: value }));
  }

  function addCallsign() {
    const formattedCallsign = newCallsign.trim().toUpperCase();

    if (!formattedCallsign) return;

    setCallsigns((current) =>
      current.includes(formattedCallsign)
        ? current
        : [...current, formattedCallsign].slice(-20)
    );
    updateController("callsign", formattedCallsign);
    setNewCallsign("");
  }

  function updateSituationTemplate(field, value) {
    setSituationTemplate((current) => ({ ...current, [field]: value }));
  }

  function updateSelfSetup(field, value) {
    setSelfSetup((current) => ({ ...current, [field]: value }));
  }

  function addSelfCallsign() {
    const callsign = newCallsign.trim().toUpperCase();

    if (!callsign) return;

    setCallsigns((current) =>
      current.includes(callsign) ? current : [...current, callsign].slice(-20)
    );
    updateSelfSetup("callsign", callsign);
    setNewCallsign("");
  }

  function toggleSelfThreat(threat) {
    setSelfSetup((current) => {
      const selectedThreats = new Set(current.threatSelections || []);

      if (selectedThreats.has(threat)) {
        selectedThreats.delete(threat);
      } else {
        selectedThreats.add(threat);
      }

      const threatSelections = [...selectedThreats];

      return {
        ...current,
        threatSelections,
        threats: threatSelections.join(" "),
      };
    });
  }

  function selectSavedOp(opId) {
    const selectedOp = opHistory.find((op) => op.id === opId);

    setSelfSetup((current) => ({
      ...current,
      savedOpId: opId,
      opName: selectedOp?.name || current.opName,
      opGrid: selectedOp?.mgrs || current.opGrid,
    }));
  }

  function buildSelfControlPoint() {
    const position = parseMgrs(selfSetup.controlPointGrid);
    const type = selfSetup.controlPointType;
    const labelType = type.toUpperCase();
    const existingCount =
      selfSetupControlPoints.filter((point) => point.type === type).length +
      controlPoints.filter((point) => point.type === type).length +
      1;
    const name = selfSetup.controlPointName.trim() || `${labelType} ${existingCount}`;

    return {
      id: `${labelType}-${Date.now()}`,
      type,
      name,
      position,
      mgrs: mgrs.forward([position.lng, position.lat]),
      createdAt: getTimestamp(),
      source: "Self-led setup",
    };
  }

  function addSelfControlPoint() {
    try {
      const point = buildSelfControlPoint();
      setSelfSetupControlPoints((current) => [...current, point]);
      updateSelfSetup("controlPointGrid", "");
      updateSelfSetup("controlPointName", "");
    } catch {
      alert("Check the IP/BP MGRS grid before adding it.");
    }
  }

  function deleteSelfControlPoint(pointId) {
    setSelfSetupControlPoints((current) =>
      current.filter((point) => point.id !== pointId)
    );
  }

  function rememberOp(name, position) {
    const opName = name.trim() || `OP ${opHistory.length + 1}`;
    const opGrid = formatMgrs(position);

    setOpHistory((current) => {
      const withoutDuplicate = current.filter(
        (op) => op.mgrs !== opGrid && op.name.toUpperCase() !== opName.toUpperCase()
      );

      return [
        {
          id: `OP-${Date.now()}`,
          name: opName.toUpperCase(),
          mgrs: opGrid,
          position,
          createdAt: getTimestamp(),
        },
        ...withoutDuplicate,
      ].slice(0, 12);
    });
  }

  function pushSituationUpdate() {
    setController((current) => ({
      ...current,
      friendlies: situationTemplate.friendlyPosture,
      situationUpdate: [
        situationTemplate.friendlyPosture,
        situationTemplate.enemyActivity,
        situationTemplate.civilianPattern,
        situationTemplate.controlMeasure,
      ].join(" "),
    }));
  }

  function pushThreatsAndRestrictions() {
    setController((current) => ({
      ...current,
      threats: `${situationTemplate.threatType} ${situationTemplate.enemyActivity}`,
      restrictions: `${situationTemplate.restrictionType} ${situationTemplate.controlMeasure}`,
    }));
  }

  function pushAircraftForCheckIn() {
    const aircraftId = selectedAircraft.replace("type:", "");
    const manualScenario =
      checkInDeliveryMode === "dsVoice"
        ? dsVoicePreview
        : null;
    const tasking = {
      id: `CHECKIN-${Date.now()}`,
      aircraftId,
      aircraftLabel: selectedAircraftLabel,
      controllerCallsign: controller.callsign,
      deliveryMode: checkInDeliveryMode,
      deliveryLabel:
        checkInDeliveryOptions.find((option) => option.id === checkInDeliveryMode)
          ?.label || "Generated text",
      manualScenario,
      pushedAt: getTimestamp(),
      route: "Awaiting troop route to an IP/BP before check-in.",
      routeStatus: "AWAITING TROOP ROUTE",
      routedControlPoint: null,
      extraPlaytimeMinutes: 0,
      routedAt: null,
    };

    setPendingCheckIn(tasking);
  }

  function startSelfLedGeneratedSerial() {
    try {
      const opPosition = parseMgrs(selfSetup.opGrid);
      const setupControlPoints =
        selfSetupControlPoints.length > 0
          ? selfSetupControlPoints
          : [buildSelfControlPoint()];
      const availableAircraft = getAircraftOptions();
      const resolvedAircraft =
        selectedAircraft === "random"
          ? availableAircraft[Math.floor(Math.random() * availableAircraft.length)]
          : availableAircraft.find(
              (aircraft) => aircraft.id === selectedAircraft.replace("type:", "")
            );
      const aircraftId = resolvedAircraft?.id || "typhoon";
      const aircraftLabel = resolvedAircraft?.label || "Typhoon";
      const tasking = {
        id: `CHECKIN-${Date.now()}`,
        aircraftId,
        aircraftLabel,
        controllerCallsign:
          selfSetup.callsign.trim().toUpperCase() || defaultController.callsign,
        deliveryMode: "generatedText",
        deliveryLabel: "Generated text",
        manualScenario: null,
        pushedAt: getTimestamp(),
        route: "Aircraft awaiting signaller route to the correct IP/BP.",
        routeStatus: `REQUESTING ROUTE TO ${getControlPointRoleForAircraft(aircraftLabel).toUpperCase()}`,
        clearanceRequested: true,
        routedControlPoint: null,
        routePosition: null,
        routeStartedAt: null,
        inboundStartPosition: null,
        extraPlaytimeMinutes: 0,
        routedAt: null,
      };

      setObserverPosition(opPosition);
      window.localStorage.setItem(savedObserverPosition, JSON.stringify(opPosition));
      window.localStorage.setItem(savedMapCenter, JSON.stringify(opPosition));
      rememberOp(selfSetup.opName, opPosition);
      setControlPoints(setupControlPoints);
      window.localStorage.setItem(
        savedControlPoints,
        JSON.stringify(setupControlPoints)
      );
      setController((current) => ({
        ...current,
        callsign: selfSetup.callsign.trim().toUpperCase() || current.callsign,
        situationUpdate: selfSetup.situationUpdate,
        friendlies: selfSetup.friendlies,
        threats: selfSetup.threats,
        restrictions: selfSetup.restrictions,
        targetDevelopment: selfSetup.targetDevelopment,
        opTasking: `OP set during self-led setup: ${formatMgrs(opPosition)}.`,
      }));
      setTargetStatus({
        phase: "OP plotted",
        notes: `Self-led setup complete. OP ${formatMgrs(opPosition)} and ${setupControlPoints.length} IP/BP ready.`,
        completed: ["OP plotted"],
        intelAlert: false,
      });
      window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(tasking));
      setPendingCheckIn(tasking);
      setSelfSetupComplete(true);
      onNavigate("checkin");
    } catch {
      alert("Check the OP and IP/BP MGRS grids before starting the serial.");
    }
  }

  function saveDsControlPoint() {
    try {
      const position = parseMgrs(controlPointGrid);
      const nextNumber =
        controlPoints.filter((point) => point.type === controlPointType).length + 1;
      const point = {
        id: `${controlPointType.toUpperCase()}-${Date.now()}`,
        type: controlPointType,
        name:
          controlPointName.trim() ||
          `${controlPointType.toUpperCase()} ${nextNumber}`,
        position,
        mgrs: mgrs.forward([position.lng, position.lat]),
        createdAt: getTimestamp(),
        source: "DS",
      };

      setControlPoints((current) => [...current, point]);
      setControlPointGrid("");
      setControlPointName("");
    } catch {
      alert("Invalid IP/BP MGRS grid.");
    }
  }

  function deleteControlPoint(pointId) {
    setControlPoints((current) =>
      current.filter((point) => point.id !== pointId)
    );
  }

  function pushOpPosition() {
    try {
      const position = parseMgrs(opGrid);
      setObserverPosition(position);
      rememberOp(`OP ${opHistory.length + 1}`, position);
      setController((current) => ({
        ...current,
        opTasking: `OP pushed by DS: ${formatMgrs(position)}. Confirm placement on map.`,
      }));
      setTargetStatus({
        phase: "OP plotted",
        notes: `DS pushed OP grid ${formatMgrs(position)}.`,
        completed: [
          ...new Set([...(targetStatus.completed || []), "OP plotted"]),
        ],
        intelAlert: targetStatus.intelAlert,
      });
    } catch {
      alert("Invalid OP MGRS grid.");
    }
  }

  function pushIntelInject() {
    const selectedInject = targetInjectTypes.find(
      (inject) => inject.id === targetInjectType
    );
    const description =
      intelText.trim() ||
      `${selectedInject?.template || ""} ${situationTemplate.enemyActivity}`;

    const inject = {
      id: `INTEL-${Date.now()}`,
      createdAt: getTimestamp(),
      type: selectedInject?.label || "Intel",
      description,
    };

    setIntelInjects((current) => [inject, ...current].slice(0, 10));
    setController((current) => ({
      ...current,
      targetDevelopment: description,
    }));
    setTargetStatus({
      phase: "Intel received",
      notes: `${inject.type}: ${description}`,
      completed: targetStatus.completed || [],
      intelAlert: true,
    });
    setIntelText("");
  }

  function pushTargetToMap() {
    if (!targetDescription.trim()) {
      alert("Add a target description first.");
      return;
    }

    try {
      const position = parseMgrs(targetGrid);
      const targetNumber = targets.length + 1;
      const target = {
        id: `TGT-${String(targetNumber).padStart(3, "0")}`,
        description: targetDescription.trim(),
        type: targetType,
        position,
        mgrs: mgrs.forward([position.lng, position.lat]),
        createdAt: new Date().toLocaleTimeString(),
        source: "DS PUSH",
      };

      setTargets((current) => [...current, target]);
      setController((current) => ({
        ...current,
        targetDevelopment: `DS pushed ${target.id}: ${target.description} at ${formatMgrs(position)}.`,
      }));
      setTargetStatus({
        phase: "Target plotted",
        notes: `DS pushed ${target.id} to the map.`,
        completed: [
          ...new Set([...(targetStatus.completed || []), "Target plotted"]),
        ],
        intelAlert: targetStatus.intelAlert,
      });
      setTargetDescription("");
      setTargetGrid("");
    } catch {
      alert("Invalid target MGRS grid.");
    }
  }

  function updateTargetStatus(phase) {
    const completed = new Set(targetStatus.completed || []);
    completed.add(phase);

    setTargetStatus({
      phase,
      notes: `${phase} at ${getTimestamp()}.`,
      completed: [...completed],
      intelAlert: phase === "Intel received" ? false : targetStatus.intelAlert,
    });
  }

  function toggleTask(phaseId, taskIndex) {
    const key = getTaskKey(phaseId, taskIndex);
    setCompletedTasks((current) => ({ ...current, [key]: !current[key] }));
  }

  function resetSerial() {
    setCompletedTasks({});
    setDebrief("");
    setController(defaultController);
    setAttackStatus(defaultAttackStatus);
  }

  function saveTrainingLog() {
    const entry = {
      id: `SERIAL-${Date.now()}`,
      createdAt: getTimestamp(),
      progress,
      controller,
      debrief,
      attackStatus,
      aircraftSelection: selectedAircraftLabel,
      platform: selectedPlatform || null,
    };

    setLogs((current) => [entry, ...current].slice(0, 10));
  }

  function deleteLog(id) {
    setLogs((current) => current.filter((log) => log.id !== id));
  }

  function updateAttackBrief(field, value) {
    setAttackBriefDraft((current) => ({ ...current, [field]: value }));
    setAttackReadbackState("Pending");
  }

  function saveSerialAttackBrief() {
    if (!selectedAttackPlatform || !selectedAttackTarget) {
      alert("Select a checked-in aircraft and plotted target first.");
      return;
    }

    const savedBrief = {
      id: `ATTACK-${Date.now()}`,
      createdAt: getTimestamp(),
      readbackConfirmed: attackReadbackState === "Correct",
      platform: {
        callsign: selectedAttackPlatform.callsign,
        aircraft: selectedAttackPlatform.aircraft,
        positionAltitude: selectedAttackPlatform.positionAltitude,
        capabilities: selectedAttackPlatform.capabilities,
      },
      target: selectedAttackTarget,
      brief: attackBriefDraft,
      lines: attackNineLines,
    };

    setAttackBriefs((current) => [savedBrief, ...current].slice(0, 12));
    setSelectedAttackBriefId(savedBrief.id);
    setAttackStatus((current) => ({
      ...current,
      phase: "9-Line passed",
      linkedBriefId: savedBrief.id,
      bda: `9-Line passed from ${savedBrief.platform.callsign} onto ${savedBrief.target.id}.`,
    }));
    setCompletedTasks((current) => ({
      ...current,
      [getTaskKey("attack", 0)]: true,
    }));
  }

  function markReadback(state) {
    setAttackReadbackState(state);
    if (attackStatus.linkedBriefId) {
      setAttackBriefs((current) =>
        current.map((brief) =>
          brief.id === attackStatus.linkedBriefId
            ? { ...brief, readbackConfirmed: state === "Correct" }
            : brief
        )
      );
    }
    setAttackStatus((current) => ({
      ...current,
      phase: state === "Correct" ? "Readback correct" : "9-Line passed",
      bda:
        state === "Correct"
          ? "DS confirmed readback correct."
          : "DS marked readback incorrect. Re-brief required.",
    }));

    if (state === "Correct") {
      setCompletedTasks((current) => ({
        ...current,
        [getTaskKey("attack", 1)]: true,
      }));
    }
  }

  function linkAttackBrief() {
    if (!selectedAttackBriefId) {
      alert("Select a saved 9-Line first.");
      return;
    }

    const selectedBrief = attackBriefs.find(
      (brief) => brief.id === selectedAttackBriefId
    );

    setAttackStatus((current) => ({
      ...current,
      phase: "9-Line prepared",
      linkedBriefId: selectedAttackBriefId,
      bda: selectedBrief
        ? `Linked 9-Line for ${selectedBrief.platform.callsign} onto ${selectedBrief.target.id}.`
        : current.bda,
    }));
    setAttackReadbackState(
      selectedBrief?.readbackConfirmed ? "Correct" : "Pending"
    );
  }

  function setAttackPhase(phase) {
    const now = Date.now();
    const startsAttackRun = phase === "Cleared hot";
    const attackRunDurationMs = getAttackRunDurationMs(
      linkedAttackBrief?.platform?.aircraft ||
        selectedAttackPlatform?.aircraft ||
        selectedPlatform?.aircraft
    );
    const bdaDelayMs = getBdaDelayMs(
      linkedAttackBrief?.platform?.aircraft ||
        selectedAttackPlatform?.aircraft ||
        selectedPlatform?.aircraft
    );

    setAttackStatus((current) => ({
      ...current,
      phase,
      clearance:
        phase === "Cleared hot"
          ? "Cleared hot"
          : phase === "Abort"
            ? "Abort"
            : phase === "Dry / no drop"
            ? "Dry / no drop"
            : current.clearance,
      attackRunStartedAt: startsAttackRun ? now : current.attackRunStartedAt,
      attackRunDurationMs: startsAttackRun
        ? attackRunDurationMs
        : current.attackRunDurationMs,
      bdaAvailableAt: startsAttackRun
        ? now + attackRunDurationMs + bdaDelayMs
        : ["Abort", "Dry / no drop"].includes(phase)
          ? null
          : current.bdaAvailableAt,
      bdaDelayMs: startsAttackRun ? bdaDelayMs : current.bdaDelayMs,
      bda:
        startsAttackRun
          ? `Cleared hot. Attack run in progress; BDA expected in ${formatCountdown(attackRunDurationMs + bdaDelayMs)}.`
          : current.bda,
    }));

    if (["Cleared hot", "Abort", "Dry / no drop"].includes(phase)) {
      setCompletedTasks((current) => ({
        ...current,
        [getTaskKey("attack", 2)]: true,
      }));
    }

    if (["Effects observed", "Re-attack required"].includes(phase)) {
      setCompletedTasks((current) => ({
        ...current,
        [getTaskKey("effects", 0)]: true,
        [getTaskKey("effects", 1)]: phase === "Re-attack required" || current[getTaskKey("effects", 1)],
      }));
    }
  }

  function sendPlatformBda() {
    if (!canSendBda) {
      alert(`BDA not available yet. Wait ${formatCountdown(bdaRemainingMs)}.`);
      return;
    }

    const platformCallsign =
      linkedAttackBrief?.platform?.callsign ||
      selectedPlatform?.callsign ||
      selectedAircraftLabel;
    const bda = `${platformCallsign}: ${bdaEffect}. ${bdaText || "No further BDA."}`;

    setAttackStatus((current) => ({
      ...current,
      phase: bdaEffect.includes("Re-attack") ? "Re-attack required" : "Effects observed",
      bda,
      effect: bdaEffect,
      reattack: reattackDecision,
      bdaAvailableAt: null,
    }));
    setCompletedTasks((current) => ({
      ...current,
      [getTaskKey("effects", 0)]: true,
      [getTaskKey("effects", 1)]: true,
    }));
    setBdaText("");
  }

  function autoSelfLedReadback() {
    if (!attackStatus.linkedBriefId) {
      if (!selectedAttackPlatform || !selectedAttackTarget) {
        alert("Select a checked-in aircraft and plotted target first.");
        return;
      }

      const savedBrief = {
        id: `ATTACK-${Date.now()}`,
        createdAt: getTimestamp(),
        readbackConfirmed: true,
        platform: {
          callsign: selectedAttackPlatform.callsign,
          aircraft: selectedAttackPlatform.aircraft,
          positionAltitude: selectedAttackPlatform.positionAltitude,
          capabilities: selectedAttackPlatform.capabilities,
        },
        target: selectedAttackTarget,
        brief: attackBriefDraft,
        lines: attackNineLines,
      };

      setAttackBriefs((current) => [savedBrief, ...current].slice(0, 12));
      setSelectedAttackBriefId(savedBrief.id);
      setAttackReadbackState("Correct");
      setAttackStatus((current) => ({
        ...current,
        phase: "Readback correct",
        linkedBriefId: savedBrief.id,
        bda: `Auto DS confirmed readback for ${savedBrief.platform.callsign} onto ${savedBrief.target.id}.`,
      }));
      setCompletedTasks((current) => ({
        ...current,
        [getTaskKey("attack", 0)]: true,
        [getTaskKey("attack", 1)]: true,
      }));
      return;
    }

    markReadback("Correct");
  }

  function autoSelfLedClearance() {
    if (!attackStatus.linkedBriefId) {
      if (!selectedAttackPlatform || !selectedAttackTarget) {
        alert("Select a checked-in aircraft and plotted target first.");
        return;
      }

      autoSelfLedReadback();
    } else if (attackReadbackState !== "Correct") {
      markReadback("Correct");
    }

    setAttackPhase("Cleared hot");
  }

  function autoSelfLedBda() {
    if (!canSendBda) {
      alert(`BDA not available yet. Wait ${formatCountdown(bdaRemainingMs)}.`);
      return;
    }

    const platformCallsign =
      linkedAttackBrief?.platform?.callsign ||
      selectedAttackPlatform?.callsign ||
      selectedPlatform?.callsign ||
      "Aircraft";
    const targetId =
      linkedAttackBrief?.target?.id || selectedAttackTarget?.id || "target";
    const bda = `${platformCallsign}: Target effects observed on ${targetId}. No re-attack required.`;

    setAttackStatus((current) => ({
      ...current,
      phase: "Effects observed",
      bda,
      effect: "Target hit",
      reattack: "No re-attack required",
      bdaAvailableAt: null,
    }));
    setCompletedTasks((current) => ({
      ...current,
      [getTaskKey("effects", 0)]: true,
      [getTaskKey("effects", 1)]: true,
      [getTaskKey("effects", 2)]: true,
    }));
  }

  function routePendingAircraft(point) {
    if (!pendingCheckIn) return;

    const routeLabel = formatControlPointLabel(point);
    const routeType = getControlPointRoleForAircraft(
      pendingCheckIn.aircraftLabel || pendingCheckIn.aircraftId
    );

    if (point.type !== routeType) {
      alert(
        `${pendingCheckIn.aircraftLabel || "This aircraft"} should be routed to a ${routeType.toUpperCase()}.`
      );
      return;
    }

    const updatedTasking = {
      ...pendingCheckIn,
      route: `Aircraft cleared to ${routeLabel}. Await established call.`,
      routeStatus: `ROUTING TO ${routeLabel}`,
      clearanceRequested: false,
      routeEstablishedAt: null,
      routedControlPoint: {
        id: point.id,
        type: point.type,
        name: point.name,
        label: routeLabel,
        position: point.position,
        mgrs: point.mgrs,
      },
      routePosition: point.position,
      routeAltitude: pendingCheckIn.routeAltitude || getDefaultRouteAltitude(
        pendingCheckIn.aircraftLabel || pendingCheckIn.aircraftId
      ),
      routeStartedAt: Date.now(),
      inboundStartPosition: getInboundStartPosition(point.position),
      routedAt: getTimestamp(),
    };

    setPendingCheckIn(updatedTasking);
    setRoutePickerOpen(false);
  }

  function updatePendingRouteAltitude(altitude) {
    if (!pendingCheckIn) return;

    setPendingCheckIn((current) => ({
      ...current,
      routeAltitude: altitude,
    }));
  }

  function updatePlatformHeight(platformId, altitude) {
    setPlatforms((currentPlatforms) =>
      currentPlatforms.map((platform) =>
        platform.id === platformId
          ? {
              ...platform,
              positionAltitude: replaceAltitude(platform.positionAltitude, altitude),
            }
          : platform
      )
    );
  }

  function addPendingAircraftTime(minutes) {
    if (!pendingCheckIn) return;

    setPendingCheckIn((current) => ({
      ...current,
      extraPlaytimeMinutes: (current.extraPlaytimeMinutes || 0) + minutes,
    }));
  }

  function addPlatformTime(platformId, minutes) {
    setPlatforms((currentPlatforms) =>
      currentPlatforms.map((platform) =>
        platform.id === platformId
          ? {
              ...platform,
              extraPlaytimeMinutes:
                (platform.extraPlaytimeMinutes || 0) + minutes,
              status:
                platform.status === "CHECKED IN"
                  ? `CHECKED IN / PLUS ${minutes} MIN`
                  : platform.status,
            }
          : platform
      )
    );
  }

  if (serialMode && serialVariant === "self" && !selfSetupComplete) {
    return (
      <main className="page trainingPage">
        <header className="pageHeader">
          <div>
            <h1>Self-Led Serial Setup</h1>
            <p>
              Build the ground picture and control points first, then launch
              straight into an auto-generated check-in.
            </p>
          </div>
          <div className="headerActions">
            <span className="statusPill">SELF-LED SETUP</span>
            <button onClick={onExitSerial}>Exit To Main Menu</button>
          </div>
        </header>

        <section className="card selfSetupCard">
          <h2>Serial Details</h2>

          <div className="grid compactGrid">
            <label className="field">
              Callsign
              <select
                value={selfSetup.callsign}
                onChange={(event) =>
                  updateSelfSetup("callsign", event.target.value.toUpperCase())
                }
              >
                {callsigns.map((callsign) => (
                  <option key={callsign} value={callsign}>
                    {callsign}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              Aircraft / platform
              <select
                value={selectedAircraft}
                onChange={(event) => setSelectedAircraft(event.target.value)}
              >
                {aircraftChoices.map((aircraft) => (
                  <option key={aircraft.id} value={aircraft.id}>
                    {aircraft.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              Add callsign
              <input
                value={newCallsign}
                onChange={(event) =>
                  setNewCallsign(event.target.value.toUpperCase())
                }
                placeholder="Example: VINTAGE 12"
              />
            </label>
            <button onClick={addSelfCallsign}>Add Callsign</button>
          </div>

          <label className="field">
            Situation update
            <textarea
              value={selfSetup.situationUpdate}
              onChange={(event) =>
                updateSelfSetup("situationUpdate", event.target.value)
              }
            />
          </label>

          <div className="grid compactGrid">
            <label className="field">
              Friendly situation
              <textarea
                value={selfSetup.friendlies}
                onChange={(event) =>
                  updateSelfSetup("friendlies", event.target.value)
                }
              />
            </label>

            <label className="field">
              Threats
              <select value="" onChange={(event) => toggleSelfThreat(event.target.value)}>
                <option value="">Add threat</option>
                {situationOptions.threatType.map((threat) => (
                  <option key={threat}>{threat}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="targetStatusGrid">
            {(selfSetup.threatSelections || []).map((threat) => (
              <button
                key={threat}
                className="activeMode"
                onClick={() => toggleSelfThreat(threat)}
              >
                {threat}
              </button>
            ))}
          </div>

          <label className="field">
            Restrictions
            <textarea
              value={selfSetup.restrictions}
              onChange={(event) =>
                updateSelfSetup("restrictions", event.target.value)
              }
            />
          </label>

          <div className="grid compactGrid">
            <label className="field">
              Saved OP
              <select
                value={selfSetup.savedOpId}
                onChange={(event) => selectSavedOp(event.target.value)}
              >
                <option value="">Manual OP grid</option>
                {opHistory.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} / {op.mgrs}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              OP name
              <input
                value={selfSetup.opName}
                onChange={(event) =>
                  updateSelfSetup("opName", event.target.value.toUpperCase())
                }
                placeholder="OP 1"
              />
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              OP MGRS
              <input
                value={selfSetup.opGrid}
                onChange={(event) =>
                  updateSelfSetup("opGrid", event.target.value.toUpperCase())
                }
                placeholder="Example: 30U WB 43508 92788"
              />
            </label>

            <label className="field">
              IP/BP MGRS
              <input
                value={selfSetup.controlPointGrid}
                onChange={(event) =>
                  updateSelfSetup(
                    "controlPointGrid",
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="Example: 30U WB 43508 92788"
              />
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              IP/BP type
              <select
                value={selfSetup.controlPointType}
                onChange={(event) =>
                  updateSelfSetup("controlPointType", event.target.value)
                }
              >
                <option value="ip">IP</option>
                <option value="bp">BP</option>
              </select>
            </label>

            <label className="field">
              IP/BP name
              <input
                value={selfSetup.controlPointName}
                onChange={(event) =>
                  updateSelfSetup(
                    "controlPointName",
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="COD"
              />
            </label>
          </div>

          <div className="briefActions">
            <button onClick={addSelfControlPoint}>Add IP/BP To Serial</button>
          </div>

          {selfSetupControlPoints.length > 0 && (
            <div className="targetIntelList">
              {selfSetupControlPoints.map((point, index) => (
                <div key={point.id} className="dataRow">
                  <span>{formatControlPointLabel(point)}</span>
                  <strong>{index === 0 ? "INITIAL ROUTE" : point.type.toUpperCase()}</strong>
                  <button
                    className="removeControlPoint"
                    onClick={() => deleteSelfControlPoint(point.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="field">
            Target development tasking
            <textarea
              value={selfSetup.targetDevelopment}
              onChange={(event) =>
                updateSelfSetup("targetDevelopment", event.target.value)
              }
            />
          </label>

          <div className="briefActions">
            <button onClick={startSelfLedGeneratedSerial}>
              Auto Push Aircraft And Start Check-In
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page trainingPage">
      <header className="pageHeader">
        <div>
          <h1>TACP Mission Trainer</h1>
          <p>Run a complete serial from aircraft check-in through effects and BDA.</p>
        </div>
        <div className="headerActions">
          <span className={progress === 100 ? "statusPill ready" : "statusPill"}>
            SERIAL {progress}% COMPLETE
          </span>
          {serialMode && (
            <button onClick={onExitSerial}>Exit To Main Menu</button>
          )}
        </div>
      </header>

      {serialMode && (
        <section className="missionLauncher">
          <button onClick={() => onNavigate("checkin")}>Check-In</button>
          <button onClick={() => onNavigate("map")}>Map / OP</button>
          <button onClick={() => onNavigate("nine")}>Build 9-Line</button>
        </section>
      )}

      <div className="trainingTabs" role="tablist" aria-label="Training views">
        <button
          className={activeView === "trainee" ? "active" : ""}
          onClick={() => setActiveView("trainee")}
        >
          Exercising Troop
        </button>
        <button
          className={activeView === "instructor" ? "active" : ""}
          onClick={() => setActiveView("instructor")}
        >
          DS / Instructor
        </button>
        <button
          className={activeView === "platforms" ? "active" : ""}
          onClick={() => setActiveView("platforms")}
        >
          Live Aircraft
        </button>
      </div>

      {activeView === "trainee" && (
        <>
      <section className="trainingGrid">
        <div className="card serialControl">
          <h2>Situation Update</h2>
          {pendingCheckIn && (
            <div className="serialCard checkInAlert">
              <small>Aircraft ready to check in</small>
              <p>
                {pendingCheckIn.aircraftLabel} pushed by DS at{" "}
                {pendingCheckIn.pushedAt}. Callsign to answer:{" "}
                {pendingCheckIn.controllerCallsign}.
              </p>
              <p>{pendingCheckIn.routeStatus || "AWAITING TROOP ROUTE"}</p>
              {!pendingCheckIn.routedControlPoint && (
                <button onClick={() => setRoutePickerOpen(true)}>
                  Route Aircraft
                </button>
              )}
            </div>
          )}

          <label className="field">
            Situation update received
            <textarea
              value={controller.situationUpdate}
              readOnly
            />
          </label>

          <div className="grid compactGrid">
            <label className="field">
              Friendly situation
              <textarea
                value={controller.friendlies}
                readOnly
              />
            </label>

            <label className="field">
              Threats
              <textarea
                value={controller.threats}
                readOnly
              />
            </label>
          </div>

          <label className="field">
            Restrictions
            <textarea
              value={controller.restrictions}
              readOnly
            />
          </label>
        </div>

        <div className="card serialSnapshot">
          <h2>Target Development Window</h2>
          <div className="dataRow">
            <span>OP grid</span>
            <strong>{formatMgrs(observerPosition)}</strong>
          </div>

          <label className="field">
            OP tasking
            <textarea value={controller.opTasking} readOnly />
          </label>

          <label className="field">
            Target development tasking
            <textarea
              value={controller.targetDevelopment}
              readOnly
            />
          </label>

          <div className="serialCard">
            <small>Latest intel</small>
            <p>{latestIntel?.description || "No intel inject pushed yet."}</p>
          </div>

          <div className="serialCard">
            <small>Target development status</small>
            <p>
              {targetStatus.phase} - {targetStatus.notes}
            </p>
          </div>

          <div className="targetStatusGrid">
            {targetStatuses.map((status) => (
              <button
                key={status}
                className={[
                  targetStatus.phase === status ? "activeMode" : "",
                  targetStatus.completed?.includes(status) ? "statusComplete" : "",
                  status === "Intel received" && targetStatus.intelAlert
                    ? "statusAlert"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => updateTargetStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="targetIntelList">
            {controlPoints.length > 0 && (
              <div className="serialCard">
                <small>IP / BP available</small>
                {getRouteableControlPoints(
                  controlPoints,
                  pendingCheckIn?.aircraftLabel || pendingCheckIn?.aircraftId
                ).map((point) => (
                  <p key={point.id}>
                    {point.name} / {point.type.toUpperCase()} / {formatMgrs(point.position)}
                  </p>
                ))}
              </div>
            )}

            {targets.length === 0 ? (
              <p className="emptyText">No targets plotted yet.</p>
            ) : (
              targets.map((target) => (
                <div key={target.id} className="dataRow">
                  <span>{target.id}</span>
                  <strong>{target.description}</strong>
                </div>
              ))
            )}
          </div>

          <div className="serialCard">
            <small>Next actions</small>
            <p>
              After the situation update, use map trainer, ISR feed and intel-style
              tasking to create or confirm targets. The talk-on and 9-line happen
              after this window, not during serial setup.
            </p>
          </div>
        </div>
      </section>

      <section className="card phaseBoard">
        <h2>Serial Flow</h2>
        <div className="phaseGrid">
          {serialPhases.map((phase) => {
            const phaseDone = phase.tasks.every(
              (_, index) => completedTasks[getTaskKey(phase.id, index)]
            );

            return (
              <article key={phase.id} className={phaseDone ? "phaseCard done" : "phaseCard"}>
                <h3>{phase.title}</h3>
                {phase.tasks.map((task, index) => {
                  const key = getTaskKey(phase.id, index);
                  return (
                    <label key={task} className="taskCheck">
                      <input
                        type="checkbox"
                        checked={Boolean(completedTasks[key])}
                        onChange={() => toggleTask(phase.id, index)}
                      />
                      <span>{task}</span>
                    </label>
                  );
                })}
              </article>
            );
          })}
        </div>
      </section>

      <section className="trainingGrid">
        <div className="card serialSnapshot">
          <h2>Attack / Effects</h2>
          <div className="dataRow">
            <span>Attack status</span>
            <strong>{attackStatus.phase}</strong>
          </div>
          <div className="dataRow">
            <span>Clearance</span>
            <strong>{attackStatus.clearance}</strong>
          </div>
          <div className="dataRow">
            <span>Strike timing</span>
            <strong>
              {attackRunRemainingMs > 0
                ? `Attack run ${formatCountdown(attackRunRemainingMs)}`
                  : bdaRemainingMs > 0
                    ? `BDA in ${formatCountdown(bdaRemainingMs)}`
                    : attackStatus.bdaAvailableAt
                      ? "BDA available"
                    : "Awaiting clearance"}
            </strong>
          </div>
          <div className="dataRow">
            <span>Linked 9-Line</span>
            <strong>
              {linkedAttackBrief
                ? `${linkedAttackBrief.platform.callsign} onto ${linkedAttackBrief.target.id}`
                : "NONE"}
            </strong>
          </div>
          <div className="serialCard">
            <small>Platform BDA</small>
            <p>{attackStatus.bda}</p>
          </div>
        </div>
      </section>

      <section className="briefGrid serialAttackGrid">
        <div className="card briefBuilder">
          <h2>Attack Phase</h2>

          <div className="grid compactGrid">
            <label className="field">
              Aircraft
              <select
                value={selectedAttackPlatformId}
                onChange={(event) =>
                  setSelectedAttackPlatformId(event.target.value)
                }
              >
                {!platforms.length && (
                  <option value="">No checked-in aircraft</option>
                )}
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.callsign} - {platform.aircraft}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              Target
              <select
                value={selectedAttackTargetId}
                onChange={(event) =>
                  setSelectedAttackTargetId(event.target.value)
                }
              >
                {!targets.length && <option value="">No plotted targets</option>}
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.id} - {target.description || target.type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              Control type
              <select
                value={attackBriefDraft.controlType}
                onChange={(event) =>
                  updateAttackBrief("controlType", event.target.value)
                }
              >
                <option>TYPE 1</option>
                <option>TYPE 2</option>
                <option>TYPE 3</option>
              </select>
            </label>

            <label className="field">
              Attack method
              <select
                value={attackBriefDraft.attackMethod}
                onChange={(event) =>
                  updateAttackBrief("attackMethod", event.target.value)
                }
              >
                <option>BOT</option>
                <option>BOC</option>
                <option>SEAD</option>
                <option>SHOW OF FORCE</option>
              </select>
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              IP / BP
              <input
                value={attackBriefDraft.ipBp}
                onChange={(event) =>
                  updateAttackBrief("ipBp", event.target.value.toUpperCase())
                }
              />
            </label>

            <label className="field">
              Mark
              <select
                value={attackBriefDraft.mark}
                onChange={(event) => updateAttackBrief("mark", event.target.value)}
              >
                <option>TALK-ON</option>
                <option>LASER</option>
                <option>IR POINTER</option>
                <option>SMOKE</option>
                <option>NONE</option>
              </select>
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              Heading
              <input
                value={attackBriefDraft.heading}
                onChange={(event) =>
                  updateAttackBrief("heading", event.target.value.toUpperCase())
                }
              />
            </label>

            <label className="field">
              Distance
              <input
                value={attackBriefDraft.distance}
                onChange={(event) =>
                  updateAttackBrief("distance", event.target.value.toUpperCase())
                }
              />
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              Target elevation
              <input
                value={attackBriefDraft.elevation}
                onChange={(event) =>
                  updateAttackBrief("elevation", event.target.value.toUpperCase())
                }
              />
            </label>

            <label className="field">
              Egress
              <input
                value={attackBriefDraft.egress}
                onChange={(event) =>
                  updateAttackBrief("egress", event.target.value.toUpperCase())
                }
              />
            </label>
          </div>

          <label className="field">
            Friendlies
            <input
              value={attackBriefDraft.friendlies}
              onChange={(event) =>
                updateAttackBrief("friendlies", event.target.value.toUpperCase())
              }
            />
          </label>

          <label className="field">
            Restrictions
            <textarea
              value={attackBriefDraft.restrictions}
              onChange={(event) =>
                updateAttackBrief("restrictions", event.target.value)
              }
            />
          </label>

          <label className="field">
            Remarks
            <textarea
              value={attackBriefDraft.remarks}
              onChange={(event) =>
                updateAttackBrief("remarks", event.target.value)
              }
              placeholder="Threats, final attack heading, abort code, laser code, TOT..."
            />
          </label>

          <div className="briefActions">
            <button onClick={saveSerialAttackBrief}>Pass / Save 9-Line</button>
            <button onClick={() => onNavigate("nine")}>Open Full 9-Line</button>
          </div>
        </div>

        <div className="card briefPreview">
          <h2>Live Attack Card</h2>

          <div className="dataRow">
            <span>Aircraft</span>
            <strong>
              {selectedAttackPlatform
                ? `${selectedAttackPlatform.callsign} / ${selectedAttackPlatform.aircraft}`
                : "NONE"}
            </strong>
          </div>
          <div className="dataRow">
            <span>Target</span>
            <strong>
              {selectedAttackTarget
                ? `${selectedAttackTarget.id} / ${formatMgrs(selectedAttackTarget.position)}`
                : "NONE"}
            </strong>
          </div>
          <div className="dataRow">
            <span>Readback</span>
            <strong>{attackReadbackState}</strong>
          </div>
          <div className="dataRow">
            <span>Clearance</span>
            <strong>{attackStatus.clearance}</strong>
          </div>

          <div className="nineLineList">
            {attackNineLines.map(([number, label, value]) => (
              <article key={label} className="lineCard">
                <span>{number}</span>
                <div>
                  <small>{label}</small>
                  <strong>{value || "UNKNOWN"}</strong>
                </div>
              </article>
            ))}
          </div>

          <div className="serialCard">
            <small>Effects / BDA received</small>
            <p>
              {attackStatus.phase} / {attackStatus.bda}
            </p>
          </div>

          {serialVariant === "self" && (
            <div className="serialCard">
              <small>Self-led auto DS</small>
              <p>
                Use these controls to emulate DS readback, clearance and aircraft BDA
                during a solo serial.
              </p>
              <div className="briefActions">
                <button onClick={autoSelfLedReadback}>Auto Readback Correct</button>
                <button onClick={autoSelfLedClearance}>Auto Cleared Hot</button>
                <button disabled={!canSendBda} onClick={autoSelfLedBda}>
                  {canSendBda
                    ? "Auto Platform BDA"
                    : attackStatus.bdaAvailableAt
                      ? `BDA ${formatCountdown(bdaRemainingMs)}`
                      : "BDA locked"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {routePickerOpen && (
        <div className="tacticalPopupOverlay">
          <div className="tacticalPopup">
            <div className="popupHeader">
              <div>
                <small>Aircraft routing</small>
                <h2>{pendingCheckIn?.aircraftLabel || "Pending aircraft"}</h2>
              </div>
              <button onClick={() => setRoutePickerOpen(false)}>Close</button>
            </div>

            {controlPoints.length === 0 ? (
              <p className="emptyText">
                No IP/BP available. Open the map to add or receive one.
              </p>
            ) : (
              <>
              <div className="routeHeightControl">
                <label>
                  Requested height block
                  <select
                    value={
                      pendingCheckIn?.routeAltitude ||
                      getDefaultRouteAltitude(
                        pendingCheckIn?.aircraftLabel || pendingCheckIn?.aircraftId
                      )
                    }
                    onChange={(event) =>
                      updatePendingRouteAltitude(event.target.value)
                    }
                  >
                    {heightBlockOptions.map((altitude) => (
                      <option key={altitude} value={altitude}>
                        {altitude}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="routePickerGrid">
                {getRouteableControlPoints(
                  controlPoints,
                  pendingCheckIn?.aircraftLabel || pendingCheckIn?.aircraftId
                ).map((point) => (
                  <button
                    key={point.id}
                    className="routePickerOption"
                    onClick={() => routePendingAircraft(point)}
                  >
                    <strong>{formatControlPointLabel(point)}</strong>
                    <span>{formatMgrs(point.position)}</span>
                  </button>
                ))}
              </div>
              </>
            )}

            <div className="deconflictionPanel">
              <h3>Airspace Deconfliction</h3>
              {platforms.length === 0 ? (
                <p className="emptyText">No checked-in aircraft on station.</p>
              ) : (
                <div className="deconflictionList">
                  {platforms.map((platform) => (
                    <div key={platform.id} className="deconflictionRow">
                      <div>
                        <strong>{platform.callsign}</strong>
                        <span>{platform.aircraft}</span>
                        <small>
                          {platform.routedControlPoint?.label || "NO IP/BP"} /{" "}
                          {platform.routePosition
                            ? formatMgrs(platform.routePosition)
                            : "GRID NOT SET"}
                        </small>
                      </div>
                      <label>
                        Height
                        <select
                          value={extractHeightBlock(platform.positionAltitude)}
                          onChange={(event) =>
                            updatePlatformHeight(platform.id, event.target.value)
                          }
                        >
                          {heightBlockOptions.map((altitude) => (
                            <option key={altitude} value={altitude}>
                              {altitude}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="secondaryAction"
              onClick={() => {
                setRoutePickerOpen(false);
                onNavigate("map");
              }}
            >
              Show Full Map
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {activeView === "instructor" && (
        <>
          <section className="trainingGrid">
            <div className="card serialControl">
              <h2>Serial Setup</h2>

              <div className="readinessStrip">
                <span className="ready">Serial</span>
                <span className={selectedAircraft ? "ready" : ""}>Aircraft</span>
              </div>

              <label className="field">
                Aircraft / platform
                <select
                  value={selectedAircraft}
                  onChange={(event) => setSelectedAircraft(event.target.value)}
                >
                  {aircraftChoices.map((aircraft) => (
                    <option key={aircraft.id} value={aircraft.id}>
                      {aircraft.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Check-in delivery
                <select
                  value={checkInDeliveryMode}
                  onChange={(event) => setCheckInDeliveryMode(event.target.value)}
                >
                  {checkInDeliveryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {checkInDeliveryMode === "dsVoice" && (
                <div className="serialCard">
                  <small>DS local voice script builder</small>

                  <div className="grid compactGrid">
                    <label className="field">
                      Aircraft callsign
                      <select
                        value={manualCheckIn.callsign}
                        onChange={(event) =>
                          setManualCheckIn((current) => ({
                            ...current,
                            callsign: event.target.value,
                          }))
                        }
                      >
                        <option value="">Random callsign</option>
                        {selectedCheckInLibrary.callsigns.map((callsign) => (
                          <option key={callsign} value={`${callsign} 11`}>
                            {callsign} 11
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      Direction
                      <select
                        value={manualCheckIn.direction}
                        onChange={(event) =>
                          setManualCheckIn((current) => ({
                            ...current,
                            direction: event.target.value,
                          }))
                        }
                      >
                        {selectedCheckInLibrary.directions.map((direction) => (
                          <option key={direction}>{direction}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid compactGrid">
                    <label className="field">
                      Altitude
                      <select
                        value={manualCheckIn.altitude}
                        onChange={(event) =>
                          setManualCheckIn((current) => ({
                            ...current,
                            altitude: event.target.value,
                          }))
                        }
                      >
                        <option value="">Random altitude</option>
                        {selectedCheckInLibrary.altitudeOptions.map((altitude) => (
                          <option key={altitude}>{altitude}</option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      Playtime
                      <select
                        value={manualCheckIn.playtime}
                        onChange={(event) =>
                          setManualCheckIn((current) => ({
                            ...current,
                            playtime: event.target.value,
                          }))
                        }
                      >
                        <option value="">Random playtime</option>
                        {selectedCheckInLibrary.playtimeOptions.map((playtime) => (
                          <option key={playtime}>{playtime}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    Ordnance
                    <select
                      value={manualCheckIn.ordnance}
                      onChange={(event) =>
                        setManualCheckIn((current) => ({
                          ...current,
                          ordnance: event.target.value,
                        }))
                      }
                    >
                      <option value="">Random ordnance</option>
                      {selectedCheckInLibrary.ordnanceOptions.map((ordnance) => (
                        <option key={ordnance}>{ordnance}</option>
                      ))}
                    </select>
                  </label>

                  <div className="grid compactGrid">
                    <label className="field">
                      Downlink code
                      <input
                        value={manualCheckIn.downlinkCode}
                        onChange={(event) =>
                          setManualCheckIn((current) => ({
                            ...current,
                            downlinkCode: event.target.value.replace(/[^0-9]/g, "").slice(0, 4),
                          }))
                        }
                        placeholder="Random if blank"
                      />
                    </label>

                    <label className="field">
                      Abort code
                      <select
                        value={manualCheckIn.abortCode}
                        onChange={(event) =>
                          setManualCheckIn((current) => ({
                            ...current,
                            abortCode: event.target.value,
                          }))
                        }
                      >
                        <option value="">Random abort code</option>
                        {selectedCheckInLibrary.abortCodes.map((abortCode) => (
                          <option key={abortCode}>{abortCode}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="radioText dsScriptPreview">
                    {dsVoicePreview?.transmissions
                      .flatMap((transmission) => transmission.lines)
                      .map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                  </div>
                </div>
              )}

              <button onClick={pushAircraftForCheckIn}>
                Push Aircraft For Check-In
              </button>

              {pendingCheckIn && (
                <div className="serialCard">
                  <small>Pending check-in</small>
                  <p>
                    {pendingCheckIn.aircraftLabel} pushed at {pendingCheckIn.pushedAt}.
                    Troop should complete assessed check-in as{" "}
                    {pendingCheckIn.controllerCallsign}. Delivery:{" "}
                    {pendingCheckIn.deliveryLabel || "Generated text"}.
                  </p>
                  <p>
                    Route: {pendingCheckIn.routeStatus || "Awaiting troop route"}
                  </p>
                </div>
              )}

              <div className="grid compactGrid">
                <label className="field">
                  Callsign
                  <select
                    value={controller.callsign}
                    onChange={(event) =>
                      updateController("callsign", event.target.value)
                    }
                  >
                    {callsigns.map((callsign) => (
                      <option key={callsign}>{callsign}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  Serial type
                  <select
                    value={controller.serialType}
                    onChange={(event) =>
                      updateController("serialType", event.target.value)
                    }
                  >
                    <option>CAS serial</option>
                    <option>Armed overwatch</option>
                    <option>ISR support</option>
                    <option>Dynamic target</option>
                    <option>Deliberate target</option>
                  </select>
                </label>
              </div>

              <div className="callsignAddRow">
                <input
                  value={newCallsign}
                  onChange={(event) =>
                    setNewCallsign(event.target.value.toUpperCase())
                  }
                  placeholder="Add callsign"
                />
                <button onClick={addCallsign}>Add</button>
              </div>

              <label className="field">
                Training objective
                <textarea
                  value={controller.objective}
                  onChange={(event) =>
                    updateController("objective", event.target.value)
                  }
                />
              </label>
            </div>

            <div className="card serialControl">
              <h2>Situation Builder</h2>

              <label className="field">
                Friendly posture
                <select
                  value={situationTemplate.friendlyPosture}
                  onChange={(event) =>
                    updateSituationTemplate("friendlyPosture", event.target.value)
                  }
                >
                  {situationOptions.friendlyPosture.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Enemy activity
                <select
                  value={situationTemplate.enemyActivity}
                  onChange={(event) =>
                    updateSituationTemplate("enemyActivity", event.target.value)
                  }
                >
                  {situationOptions.enemyActivity.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Civilian pattern
                <select
                  value={situationTemplate.civilianPattern}
                  onChange={(event) =>
                    updateSituationTemplate("civilianPattern", event.target.value)
                  }
                >
                  {situationOptions.civilianPattern.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Control measure
                <select
                  value={situationTemplate.controlMeasure}
                  onChange={(event) =>
                    updateSituationTemplate("controlMeasure", event.target.value)
                  }
                >
                  {situationOptions.controlMeasure.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <div className="serialCard">
                <small>Preview</small>
                <p>
                  {situationTemplate.friendlyPosture}{" "}
                  {situationTemplate.enemyActivity}{" "}
                  {situationTemplate.civilianPattern}{" "}
                  {situationTemplate.controlMeasure}
                </p>
              </div>

              <button onClick={pushSituationUpdate}>Push Situation Update</button>
            </div>

            <div className="card serialControl">
              <h2>Threats / Restrictions Builder</h2>

              <label className="field">
                Threat
                <select
                  value={situationTemplate.threatType}
                  onChange={(event) =>
                    updateSituationTemplate("threatType", event.target.value)
                  }
                >
                  {situationOptions.threatType.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Restriction
                <select
                  value={situationTemplate.restrictionType}
                  onChange={(event) =>
                    updateSituationTemplate("restrictionType", event.target.value)
                  }
                >
                  {situationOptions.restrictionType.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <div className="serialCard">
                <small>Threats preview</small>
                <p>
                  {situationTemplate.threatType} {situationTemplate.enemyActivity}
                </p>
              </div>

              <div className="serialCard">
                <small>Restrictions preview</small>
                <p>
                  {situationTemplate.restrictionType}{" "}
                  {situationTemplate.controlMeasure}
                </p>
              </div>

              <button onClick={pushThreatsAndRestrictions}>
                Push Threats / Restrictions
              </button>
            </div>
          </section>

          <section className="trainingGrid">
            <div className="card serialControl">
              <h2>OP / IP / BP Setup</h2>

              <label className="field">
                OP MGRS
                <input
                  value={opGrid}
                  onChange={(event) => setOpGrid(event.target.value.toUpperCase())}
                  placeholder="Example: 30U XB 12345 67890"
                />
              </label>
              <button onClick={pushOpPosition}>Push OP To Troop</button>

              <div className="grid compactGrid">
                <label className="field">
                  IP/BP MGRS
                  <input
                    value={controlPointGrid}
                    onChange={(event) =>
                      setControlPointGrid(event.target.value.toUpperCase())
                    }
                    placeholder="Example: 30U XB 12345 67890"
                  />
                </label>

                <label className="field">
                  Type
                  <select
                    value={controlPointType}
                    onChange={(event) => setControlPointType(event.target.value)}
                  >
                    <option value="ip">IP</option>
                    <option value="bp">BP</option>
                  </select>
                </label>
              </div>

              <label className="field">
                IP/BP name
                <input
                  value={controlPointName}
                  onChange={(event) => setControlPointName(event.target.value)}
                  placeholder="Auto if blank"
                />
              </label>

              <button onClick={saveDsControlPoint}>Pre-Assign IP/BP</button>

              {controlPoints.length > 0 && (
                <div className="targetIntelList">
                  {controlPoints.map((point) => (
                    <div key={point.id} className="dataRow">
                      <span>{point.name}</span>
                      <strong>{point.type.toUpperCase()}</strong>
                      <button
                        className="removeControlPoint"
                        onClick={() => deleteControlPoint(point.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card serialControl">
              <h2>Target Push</h2>

              <div className="grid compactGrid">
                <label className="field">
                  Target MGRS
                  <input
                    value={targetGrid}
                    onChange={(event) =>
                      setTargetGrid(event.target.value.toUpperCase())
                    }
                    placeholder="Target grid"
                  />
                </label>

                <label className="field">
                  Target type
                  <select
                    value={targetType}
                    onChange={(event) => setTargetType(event.target.value)}
                  >
                    <option value="enemy">Enemy</option>
                    <option value="friendly">Friendly</option>
                    <option value="neutral">Neutral</option>
                    <option value="unknown">Unknown</option>
                    <option value="objective">Objective</option>
                  </select>
                </label>
              </div>

              <label className="field">
                Target description
                <input
                  value={targetDescription}
                  onChange={(event) => setTargetDescription(event.target.value)}
                  placeholder="What the target is"
                />
              </label>

              <button onClick={pushTargetToMap}>Push Target To Map</button>
            </div>

            <div className="card serialControl">
              <h2>Intel Inject</h2>

              <label className="field">
                Inject type
                <select
                  value={targetInjectType}
                  onChange={(event) => setTargetInjectType(event.target.value)}
                >
                  {targetInjectTypes.map((inject) => (
                    <option key={inject.id} value={inject.id}>
                      {inject.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Intel for troop to plot
                <textarea
                  value={intelText}
                  onChange={(event) => setIntelText(event.target.value)}
                  placeholder="Enemy section-sized element. Grid to follow from map/intel, troop to plot and confirm."
                />
              </label>

              <button onClick={pushIntelInject}>Push Intel To Troop</button>

              <div className="targetIntelList">
                {intelInjects.length === 0 ? (
                  <p className="emptyText">No intel injects pushed yet.</p>
                ) : (
                  intelInjects.map((inject) => (
                    <div key={inject.id} className="serialCard">
                      <small>
                        {inject.createdAt} / {inject.type || "Intel"}
                      </small>
                      <p>{inject.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="trainingGrid">
            <div className="card serialSnapshot">
              <h2>DS / Instructor Monitor</h2>

              <div className="dataRow">
                <span>Aircraft selection</span>
                <strong>{selectedAircraftLabel}</strong>
              </div>
              <div className="dataRow">
                <span>Checked-in height</span>
                <strong>{selectedPlatform?.positionAltitude || "UNKNOWN"}</strong>
              </div>
              <div className="dataRow">
                <span>Playtime / DL</span>
                <strong>
                  {selectedPlatform
                    ? `${selectedPlatform.playtime} / ${selectedPlatform.downlinkCode}`
                    : "UNKNOWN"}
                </strong>
              </div>
              <div className="dataRow">
                <span>Serial type</span>
                <strong>{controller.serialType}</strong>
              </div>
              <div className="dataRow">
                <span>Abort code</span>
                <strong>{controller.abortCode}</strong>
              </div>
              <div className="dataRow">
                <span>Progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="dataRow">
                <span>OP grid</span>
                <strong>{formatMgrs(observerPosition)}</strong>
              </div>
              <div className="dataRow">
                <span>Targets plotted</span>
                <strong>{targets.length}</strong>
              </div>
              <div className="dataRow">
                <span>Target status</span>
                <strong>{targetStatus.phase}</strong>
              </div>
              <div className="dataRow">
                <span>Attack status</span>
                <strong>{attackStatus.phase}</strong>
              </div>
              <div className="dataRow">
                <span>Clearance</span>
                <strong>{attackStatus.clearance}</strong>
              </div>
              <div className="dataRow">
                <span>Strike timing</span>
                <strong>
                  {attackRunRemainingMs > 0
                    ? `Attack run ${formatCountdown(attackRunRemainingMs)}`
                      : bdaRemainingMs > 0
                        ? `BDA in ${formatCountdown(bdaRemainingMs)}`
                        : attackStatus.bdaAvailableAt
                          ? "BDA available"
                        : "Awaiting clearance"}
                </strong>
              </div>

              <div className="serialCard">
                <small>DS View</small>
                <p>
                  {controller.callsign} is running a {controller.serialType.toLowerCase()}.
                  Targets and 9-lines should be created after the situation update and
                  target development window.
                </p>
              </div>

              <label className="field">
                BDA / instructor notes
                <textarea
                  value={controller.bda}
                  onChange={(event) => updateController("bda", event.target.value)}
                  placeholder="Effects, misses, re-attack decision, comms issues..."
                />
              </label>
            </div>

            <div className="card mapMonitorCard">
              <h2>Map Monitor</h2>
              <div className="dsMapMonitor">
                <Map
                  defaultCenter={mapCenter}
                  center={mapCenter}
                  zoom={observerPosition || targets.length ? 13 : 6}
                  mapTypeId="satellite"
                  gestureHandling="none"
                  disableDefaultUI={true}
                >
                  <TargetMarkers targets={targets} />
                  <ControlPointMarkers controlPoints={controlPoints} />
                  <ObserverMarker observerPosition={observerPosition} />
                </Map>
              </div>
            </div>
          </section>

          <section className="trainingGrid">
            <div className="card serialControl">
              <h2>Attack Control</h2>

              <label className="field">
                Link saved 9-Line
                <select
                  value={selectedAttackBriefId}
                  onChange={(event) => setSelectedAttackBriefId(event.target.value)}
                >
                  <option value="">Select saved 9-Line</option>
                  {attackBriefs.map((brief) => (
                    <option key={brief.id} value={brief.id}>
                      {brief.createdAt} - {brief.platform.callsign} onto {brief.target.id}
                    </option>
                  ))}
                </select>
              </label>

              <button onClick={linkAttackBrief}>Link 9-Line To Serial</button>

              {linkedAttackBrief && (
                <div className="serialCard linkedNineLineCard">
                  <small>
                    Linked 9-Line / {linkedAttackBrief.platform.callsign} onto{" "}
                    {linkedAttackBrief.target.id}
                  </small>
                  <div className="nineLineList compactNineLineList">
                    {linkedAttackBrief.lines.map(([number, label, value]) => (
                      <article key={`${number}-${label}`} className="lineCard">
                        <span>{number}</span>
                        <div>
                          <small>{label}</small>
                          <strong>{value || "UNKNOWN"}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="briefActions">
                    <button onClick={() => markReadback("Correct")}>
                      Readback Correct
                    </button>
                    <button onClick={() => markReadback("Incorrect")}>
                      Readback Incorrect
                    </button>
                  </div>
                </div>
              )}

              <div className="targetStatusGrid attackStatusGrid">
                {attackStatuses.map((status) => (
                  <button
                    key={status}
                    className={attackStatus.phase === status ? "activeMode" : ""}
                    onClick={() => setAttackPhase(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="card serialControl">
              <h2>Platform BDA</h2>

              <label className="field">
                Effect
                <select
                  value={bdaEffect}
                  onChange={(event) => setBdaEffect(event.target.value)}
                >
                  <option>Target effects unknown</option>
                  <option>Target hit</option>
                  <option>Target missed</option>
                  <option>Target suppressed</option>
                  <option>Target destroyed</option>
                  <option>Collateral concern</option>
                  <option>Re-attack required</option>
                </select>
              </label>

              <label className="field">
                Re-attack decision
                <select
                  value={reattackDecision}
                  onChange={(event) => setReattackDecision(event.target.value)}
                >
                  <option>Await DS decision</option>
                  <option>No re-attack required</option>
                  <option>Re-attack requested</option>
                  <option>Shift target</option>
                  <option>Cease / check fire</option>
                </select>
              </label>

              <label className="field">
                BDA as platform
                <textarea
                  value={bdaText}
                  onChange={(event) => setBdaText(event.target.value)}
                  placeholder="Example: Splash observed, target suppressed, no movement seen."
                />
              </label>

              <button disabled={!canSendBda} onClick={sendPlatformBda}>
                {canSendBda
                  ? "Send BDA As Platform"
                  : attackStatus.bdaAvailableAt
                    ? `BDA available in ${formatCountdown(bdaRemainingMs)}`
                    : "BDA locked until clearance"}
              </button>
            </div>
          </section>

          <section className="trainingGrid">
            <div className="card serialSnapshot">
              <h2>Aircraft Deconfliction</h2>
              {aircraftRows.length === 0 ? (
                <p className="emptyText">No aircraft pushed or checked in.</p>
              ) : (
                aircraftRows.map((platform) => (
                  <div
                    key={platform.id}
                    className={`dataRow ${getPlaytimeClass(platform)}`}
                  >
                    <span>
                      {platform.callsign} / {platform.status}
                    </span>
                    <strong>
                      {platform.aircraft} /{" "}
                      {formatPlatformAltitude(platform.positionAltitude)}
                    </strong>
                    <div className="inlineActions">
                      <button
                        onClick={() =>
                          platform.isPending
                            ? addPendingAircraftTime(5)
                            : addPlatformTime(platform.id, 5)
                        }
                      >
                        +5 Min
                      </button>
                      <button
                        onClick={() =>
                          platform.isPending
                            ? addPendingAircraftTime(15)
                            : addPlatformTime(platform.id, 15)
                        }
                      >
                        +15 Min
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

        <div className="card">
          <h2>Debrief / DS Notes</h2>
          <label className="field">
            Debrief notes
            <textarea
              value={debrief}
              onChange={(event) => setDebrief(event.target.value)}
              placeholder="What went well, what to repeat, weak areas..."
            />
          </label>
          <div className="briefActions">
            <button onClick={saveTrainingLog}>Save Serial Log</button>
            <button onClick={resetSerial}>Reset Serial</button>
          </div>
        </div>
      </section>

      <section className="card trainingLog">
          <h2>Training Log</h2>
          {!logs.length ? (
            <p className="emptyText">No serials saved yet.</p>
          ) : (
            logs.map((log) => (
              <article key={log.id} className="savedBrief">
                <div>
                  <strong>
                    {log.createdAt} / {log.progress}% /{" "}
                    {log.platform?.callsign || "No aircraft"}
                  </strong>
                  <span>
                    {log.target?.id || "No target"} / {log.controller.serialType}
                  </span>
                </div>
                <button className="removePlatform" onClick={() => deleteLog(log.id)}>
                  Delete
                </button>
              </article>
            ))
          )}
      </section>
        </>
      )}

      {activeView === "platforms" && (
        <section className="card platformTableCard">
          <h2>Live Aircraft / Check-In Details</h2>

          {aircraftRows.length === 0 ? (
            <p className="emptyText">No aircraft pushed or checked in yet.</p>
          ) : (
            <div className="platformTableWrap">
              <table className="platformTable">
                <thead>
                  <tr>
                    <th>Callsign</th>
                    <th>Aircraft</th>
                    <th>Position / Altitude</th>
                    <th>Playtime Remaining</th>
                    <th>Checked In</th>
                    <th>Downlink</th>
                    <th>Capabilities</th>
                    <th>Status</th>
                    <th>Route</th>
                    <th>DS Time</th>
                  </tr>
                </thead>
                <tbody>
                  {aircraftRows.map((platform) => (
                    <tr key={platform.id} className={getPlaytimeClass(platform)}>
                      <td>{platform.callsign}</td>
                      <td>{platform.aircraft}</td>
                      <td>{formatPlatformAltitude(platform.positionAltitude)}</td>
                      <td>{formatPlaytime(platform)}</td>
                      <td>{formatCheckInTime(platform.checkedInAt)}</td>
                      <td>{platform.downlinkCode}</td>
                      <td>{platform.capabilities}</td>
                      <td>{platform.status}</td>
                      <td>{platform.routeStatus || platform.route || "Not set"}</td>
                      <td>
                        <div className="inlineActions tableActions">
                          <button
                            onClick={() =>
                              platform.isPending
                                ? addPendingAircraftTime(5)
                                : addPlatformTime(platform.id, 5)
                            }
                          >
                            +5
                          </button>
                          <button
                            onClick={() =>
                              platform.isPending
                                ? addPendingAircraftTime(15)
                                : addPlatformTime(platform.id, 15)
                            }
                          >
                            +15
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function getDefaultRouteAltitude(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (normalisedAircraft.includes("APACHE") || normalisedAircraft.includes("HELI")) {
    return "1000 FT";
  }

  if (normalisedAircraft.includes("MQ-9") || normalisedAircraft.includes("REAPER")) {
    return "18000 FT";
  }

  return "15000 FT";
}

function extractHeightBlock(positionAltitude = "") {
  const feetMatch = positionAltitude.match(/(\d{3,5})\s*FT/i);
  const angelsMatch = positionAltitude.match(/ANGELS\s*(\d+)/i);

  if (feetMatch) {
    const rounded = Math.max(1000, Math.round(Number(feetMatch[1]) / 1000) * 1000);
    return `${Math.min(30000, rounded)} FT`;
  }

  if (angelsMatch) {
    return `${Math.min(30000, Number(angelsMatch[1]) * 1000)} FT`;
  }

  return "1000 FT";
}

function replaceAltitude(positionAltitude = "", altitude) {
  if (!positionAltitude) return altitude;

  if (/ANGELS\s*\d+|\d{3,5}\s*FT|LOW LEVEL/i.test(positionAltitude)) {
    return positionAltitude.replace(
      /ANGELS\s*\d+|\d{3,5}\s*FT|LOW LEVEL/i,
      altitude
    );
  }

  return `${positionAltitude}, ${altitude}`;
}

function getAttackRunDurationMs(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (normalisedAircraft.includes("APACHE") || normalisedAircraft.includes("HELI")) {
    return 75000;
  }

  if (normalisedAircraft.includes("MQ-9") || normalisedAircraft.includes("REAPER")) {
    return 120000;
  }

  return 90000;
}

function getBdaDelayMs(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (normalisedAircraft.includes("APACHE") || normalisedAircraft.includes("HELI")) {
    return 30000;
  }

  if (normalisedAircraft.includes("MQ-9") || normalisedAircraft.includes("REAPER")) {
    return 60000;
  }

  return 45000;
}

function formatCountdown(milliseconds = 0) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
