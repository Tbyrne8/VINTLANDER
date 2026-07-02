import { useEffect, useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import * as mgrs from "mgrs";
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

function loadSavedValue(key, fallback = null) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function formatMgrs(position) {
  if (!position) return "NOT SET";

  return mgrs
    .forward([position.lng, position.lat])
    .replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/, "$1 $2 $3 $4");
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
  const totalMinutes = getPlaytimeMinutes(platform.playtime);

  if (!platform.checkedInAt || totalMinutes === null) {
    return platform.playtime || "UNKNOWN";
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(platform.checkedInAt).getTime()) / 60000)
  );
  const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);

  return `${remainingMinutes} MIN REM / ${platform.playtime}`;
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
  return offsetPosition(routePosition, -18000, -9000);
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

function parseMgrs(value) {
  const [lng, lat] = mgrs.toPoint(value.replace(/\s+/g, "").trim());
  return { lat, lng };
}

export default function TacpTraining({
  platforms = [],
  onNavigate = () => {},
  serialMode = false,
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
  const [selectedAircraft, setSelectedAircraft] = useState("random");
  const [completedTasks, setCompletedTasks] = useState({});
  const [controller, setController] = useState(defaultController);
  const [debrief, setDebrief] = useState("");
  const [activeView, setActiveView] = useState("trainee");
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
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
    window.localStorage.setItem(savedTargetStatus, JSON.stringify(targetStatus));
  }, [targetStatus]);

  useEffect(() => {
    window.localStorage.setItem(savedAttackStatus, JSON.stringify(attackStatus));
  }, [attackStatus]);

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
    window.localStorage.setItem(savedCallsigns, JSON.stringify(callsigns));
  }, [callsigns]);

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

  const selectedPlatform = null;
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
  const mapCenter = observerPosition || targets[0]?.position || { lat: 51.5072, lng: -0.1276 };
  const linkedAttackBrief = attackBriefs.find(
    (brief) => brief.id === attackStatus.linkedBriefId
  );

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
      routedAt: null,
    };

    setPendingCheckIn(tasking);
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
  }

  function setAttackPhase(phase) {
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
    }));
  }

  function sendPlatformBda() {
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
    }));
    setBdaText("");
  }

  function routePendingAircraft(point) {
    if (!pendingCheckIn) return;

    const routeLabel = formatControlPointLabel(point);
    const updatedTasking = {
      ...pendingCheckIn,
      route: `Route complete. Aircraft holding ${routeLabel} at briefed height block.`,
      routeStatus: `HOLDING ${routeLabel}`,
      routedControlPoint: {
        id: point.id,
        type: point.type,
        name: point.name,
        label: routeLabel,
        position: point.position,
        mgrs: point.mgrs,
      },
      routePosition: point.position,
      routeStartedAt: Date.now(),
      inboundStartPosition: getInboundStartPosition(point.position),
      routedAt: getTimestamp(),
    };

    setPendingCheckIn(updatedTasking);
    setRoutePickerOpen(false);
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
                {controlPoints.map((point) => (
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
              <div className="routePickerGrid">
                {controlPoints.map((point) => (
                  <button
                    key={point.id}
                    className="routePickerOption"
                    onClick={() => routePendingAircraft(point)}
                  >
                    <strong>{formatControlPointLabel(point)}</strong>
                    <span>{point.mgrs || formatMgrs(point.position)}</span>
                  </button>
                ))}
              </div>
            )}

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

              <button onClick={sendPlatformBda}>Send BDA As Platform</button>
            </div>
          </section>

          <section className="trainingGrid">
            <div className="card serialSnapshot">
              <h2>Aircraft Deconfliction</h2>
              {platforms.length === 0 ? (
                <p className="emptyText">No checked-in aircraft.</p>
              ) : (
                platforms.map((platform) => (
                  <div key={platform.id} className="dataRow">
                    <span>{platform.callsign}</span>
                    <strong>
                      {platform.aircraft} / {platform.positionAltitude}
                    </strong>
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

          {platforms.length === 0 ? (
            <p className="emptyText">No aircraft checked in yet.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {platforms.map((platform) => (
                    <tr key={platform.id}>
                      <td>{platform.callsign}</td>
                      <td>{platform.aircraft}</td>
                      <td>{formatPlatformAltitude(platform.positionAltitude)}</td>
                      <td>{formatPlaytime(platform)}</td>
                      <td>{formatCheckInTime(platform.checkedInAt)}</td>
                      <td>{platform.downlinkCode}</td>
                      <td>{platform.capabilities}</td>
                      <td>{platform.status}</td>
                      <td>{platform.routeStatus || platform.route || "Not set"}</td>
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
