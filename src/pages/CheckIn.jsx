import { useEffect, useRef, useState } from "react";
import {
  generateCheckIn,
  getAircraftOptions,
} from "../utils/checkInGenerator.js";
import { markCheckInField } from "../utils/checkInMarking.js";
import { formatMgrs } from "../utils/mgrs.js";

const blankCheckIn = {
  aircraftCallsign: "",
  missionNumber: "",
  aircraftNumberType: "",
  positionAltitude: "",
  ordnance: "",
  playtime: "",
  capabilities: "",
  downlinkCode: "",
  abortCode: "",
  remarks: "",
};

const firstScenario = generateCheckIn("random");
const savedPendingCheckIn = "vintlander.pendingCheckIn";
const savedControlPoints = "vintlander.controlPoints";
const savedRadioProfile = "vintlander.radioProfile";
const savedRadioVoice = "vintlander.radioVoice";
const neuralRadioEndpoint = import.meta.env.VITE_GOOGLE_TTS_ENDPOINT || "";
const deliveryOptions = [
  { id: "generatedText", label: "Generated text" },
  { id: "generatedRadio", label: "Generated radio voice" },
  { id: "dsVoice", label: "DS local voice" },
];
const radioVoiceProfiles = [
  { id: "auto", label: "Varied pilot", rate: 1.02, pitch: 0.76, volume: 0.94, playbackRate: 1.18 },
  { id: "pilotUk", label: "UK pilot", rate: 1.04, pitch: 0.68, volume: 0.94, playbackRate: 1.2 },
  { id: "pilotUs", label: "US pilot", rate: 1.06, pitch: 0.72, volume: 0.94, playbackRate: 1.22 },
  { id: "calmController", label: "Controller", rate: 0.96, pitch: 0.8, volume: 0.92, playbackRate: 1.13 },
  { id: "fastJet", label: "Fast jet clipped", rate: 1.16, pitch: 0.68, volume: 0.95, playbackRate: 1.3 },
];
const heightBlockOptions = Array.from({ length: 30 }, (_, index) => {
  const feet = (index + 1) * 1000;
  return `${feet} FT`;
});
const checkInStages = [
  {
    label: "Aircraft",
    transmissionIndex: 0,
    fields: ["aircraftCallsign", "missionNumber", "aircraftNumberType"],
  },
  {
    label: "Position",
    transmissionIndex: 1,
    fields: ["positionAltitude", "playtime"],
  },
  {
    label: "Weapons / Sensors",
    transmissionIndex: 2,
    fields: ["ordnance", "capabilities", "downlinkCode"],
  },
  {
    label: "Control",
    transmissionIndex: 3,
    fields: ["abortCode", "remarks"],
  },
];

function loadPendingCheckIn() {
  try {
    const saved = window.localStorage.getItem(savedPendingCheckIn);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function loadSavedControlPoints() {
  try {
    const saved = window.localStorage.getItem(savedControlPoints);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function SerialWorkflowNav({ onNavigate }) {
  return (
    <section className="missionLauncher serialWorkflowRow">
      <button onClick={() => onNavigate("tacp")}>Mission</button>
      <button onClick={() => onNavigate("checkin")}>Check-In</button>
      <button onClick={() => onNavigate("map")}>Map / OP</button>
      <button onClick={() => onNavigate("nine")}>Build 9-Line</button>
    </section>
  );
}

function applyRouteToScenario(generatedScenario, pendingCheckIn) {
  const routeLabel = pendingCheckIn?.routedControlPoint?.label;

  if (!routeLabel) return generatedScenario;

  const altitude =
    pendingCheckIn.routeAltitude ||
    generatedScenario.correctCheckIn.positionAltitude.split(",")[1]?.trim() ||
    generatedScenario.correctCheckIn.positionAltitude;
  const routePhrase = pendingCheckIn.routeEstablishedAt
    ? `ESTABLISHED IN ${routeLabel}`
    : pendingCheckIn.clearanceRequested
    ? `REQUESTING CLEARANCE TO ${routeLabel}`
    : `ROUTING TO ${routeLabel}`;
  const positionAltitude = `${routePhrase}, ${altitude}`;

  return {
    ...generatedScenario,
    correctCheckIn: {
      ...generatedScenario.correctCheckIn,
      positionAltitude,
    },
    transmissions: generatedScenario.transmissions.map((transmission) => {
      if (!transmission.title.includes("POSITION")) return transmission;

      return {
        ...transmission,
        lines: [
          pendingCheckIn.routeEstablishedAt
            ? `ESTABLISHED IN ${routeLabel}.`
            : pendingCheckIn.clearanceRequested
            ? `REQUESTING CLEARANCE TO ${routeLabel}.`
            : `ROUTING TO ${routeLabel}.`,
          ...transmission.lines.slice(1),
        ],
        voiceLines: transmission.voiceLines
          ? [
              pendingCheckIn.routeEstablishedAt
                ? `ESTABLISHED IN ${routeLabel}.`
                : pendingCheckIn.clearanceRequested
                ? `REQUESTING CLEARANCE TO ${routeLabel}.`
                : `ROUTING TO ${routeLabel}.`,
              ...transmission.voiceLines.slice(1),
            ]
          : undefined,
      };
    }),
  };
}

function formatControlPointLabel(point) {
  const type = (point.type || "ip").toUpperCase();
  const rawName = String(point.name || "").trim().toUpperCase();

  if (rawName.startsWith(`${type} `)) return rawName;

  return `${type} ${rawName || "CONTROL"}`;
}

function formatRadioVoiceText(lines) {
  const digitWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

  return lines
    .map((line) =>
      line
        .replace(/\bA\/C\b/g, "aircraft")
        .replace(/\bDL\b/g, "downlink")
        .replace(/\bISR\b/g, "eye ess arr")
        .replace(/\bIR\b/g, "eye arr")
        .replace(/\bEO\b/g, "ee oh")
        .replace(/\bFMV\b/g, "eff emm vee")
        .replace(/\bTGP\b/g, "tee gee pee")
        .replace(/\bROVER\b/g, "rover")
        .replace(/\bGBU\b/g, "gee bee you")
        .replace(/\bAGM\b/g, "ay gee emm")
        .replace(/\bSDB\b/g, "ess dee bee")
        .replace(/\b30\s*MM\b/gi, "thirty mike mike")
        .replace(/\bMQ-9\b/g, "emm queue nine")
        .replace(/\bF-35A\b/g, "eff thirty five alpha")
        .replace(/\bF-35B\b/g, "eff thirty five bravo")
        .replace(/\bF-16C\b/g, "eff sixteen charlie")
        .replace(/\bF-15E\b/g, "eff fifteen echo")
        .replace(/\bF\/A-18E\b/g, "eff ay eighteen echo")
        .replace(/\bA-10C\b/g, "ay ten charlie")
        .replace(/\bAC-130J\b/g, "ay see one thirty juliett")
        .replace(/\d+/g, (digits) =>
          [...digits].map((digit) => digitWords[Number(digit)]).join(" ")
        )
    )
    .join(". ");
}

function getBestRadioVoice(voices, profileId = "auto", preferredVoiceName = "") {
  if (!voices?.length) return null;

  if (preferredVoiceName) {
    const selectedVoice = voices.find((voice) => voice.name === preferredVoiceName);

    if (selectedVoice) return selectedVoice;
  }

  const naturalVoice = voices.find((voice) =>
    /natural|online|neural|premium/i.test(voice.name)
  );
  const preferredByProfile = {
    pilotUk: ["George", "Daniel", "Ryan", "Thomas", "Arthur", "Oliver"],
    pilotUs: ["Guy", "David", "Mark", "Alex", "Roger", "Eric"],
    calmController: ["Daniel", "George", "Ryan", "David", "Guy"],
    fastJet: ["Ryan", "Guy", "Mark", "David", "Alex"],
    auto: ["George", "Daniel", "Ryan", "Guy", "David", "Mark", "Alex"],
  };
  const preferredNames = preferredByProfile[profileId] || preferredByProfile.auto;
  const preferredLang = profileId === "pilotUk" ? /^en-GB/i : /^en-(US|GB|AU|CA)/i;

  return (
    naturalVoice ||
    voices.find((voice) =>
      preferredNames.some((name) => voice.name.includes(name))
    ) ||
    voices.find((voice) => preferredLang.test(voice.lang)) ||
    voices.find((voice) => /^en/i.test(voice.lang)) ||
    null
  );
}

function getRadioProfile(profileId) {
  return (
    radioVoiceProfiles.find((profile) => profile.id === profileId) ||
    radioVoiceProfiles[0]
  );
}

function startRadioBed() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) return null;

  const context = new AudioContext();
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 900;

  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 2800;

  const gain = context.createGain();
  gain.gain.value = 0.026;

  noise.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(context.destination);
  noise.start();

  const crackleTimer = window.setInterval(() => {
    if (Math.random() < 0.72) playRadioCrackle(context);
  }, 420);

  return { context, noise, gain, crackleTimer };
}

function playRadioCrackle(context) {
  if (!context) return;

  const duration = 0.018 + Math.random() * 0.045;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    const envelope = 1 - index / data.length;
    data[index] = (Math.random() * 2 - 1) * envelope;
  }

  const source = context.createBufferSource();
  const highpass = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  highpass.type = "highpass";
  highpass.frequency.value = 1200 + Math.random() * 900;
  gain.gain.value = 0.035 + Math.random() * 0.045;
  source.connect(highpass);
  highpass.connect(gain);
  gain.connect(context.destination);
  source.start();
}

function playRadioClick(radioBed, frequency = 0.07, duration = 0.05) {
  if (!radioBed?.context) return;

  const { context } = radioBed;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = 700 + frequency * 1000;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.01);
}

function stopRadioBed(radioAudioRef) {
  const radioBed = radioAudioRef.current;

  if (!radioBed) return;

  try {
    window.clearInterval(radioBed.crackleTimer);
    radioBed.gain?.gain.exponentialRampToValueAtTime(
      0.0001,
      radioBed.context.currentTime + 0.08
    );
    window.setTimeout(() => {
      radioBed.noise?.stop();
      radioBed.context?.close();
    }, 110);
  } catch {
    radioBed.context?.close();
  }

  radioAudioRef.current = null;
}

export default function CheckIn({
  platforms,
  setPlatforms,
  onNavigate = () => {},
  serialMode = false,
}) {
  const [selectedAircraft, setSelectedAircraft] = useState("random");
  const [scenario, setScenario] = useState(firstScenario);
  const [checkIn, setCheckIn] = useState(blankCheckIn);
  const [started, setStarted] = useState(false);
  const [currentTransmission, setCurrentTransmission] = useState(0);
  const [visibleLineCount, setVisibleLineCount] = useState(0);
  const [complete, setComplete] = useState(false);
  const [results, setResults] = useState(null);
  const [guidedMode, setGuidedMode] = useState(!serialMode);
  const [pendingCheckIn, setPendingCheckIn] = useState(loadPendingCheckIn);
  const [controlPoints, setControlPoints] = useState(loadSavedControlPoints);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState("generatedText");
  const [availableVoices, setAvailableVoices] = useState([]);
  const [radioProfile, setRadioProfile] = useState(
    () => window.localStorage.getItem(savedRadioProfile) || "auto"
  );
  const [preferredRadioVoice, setPreferredRadioVoice] = useState(
    () => window.localStorage.getItem(savedRadioVoice) || ""
  );
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioEngine, setRadioEngine] = useState("");
  const radioAudioRef = useRef(null);
  const neuralAudioRef = useRef(null);

  const aircraftOptions = getAircraftOptions();
  const activeTransmission = scenario.transmissions[currentTransmission];
  const activeDeliveryMode = serialMode
    ? pendingCheckIn?.deliveryMode || "generatedText"
    : deliveryMode;
  const isDsVoiceMode = activeDeliveryMode === "dsVoice";
  const isVoiceMode = activeDeliveryMode === "generatedRadio";

  useEffect(() => {
    if (serialMode) {
      setGuidedMode(false);
      setPendingCheckIn(loadPendingCheckIn());
      setControlPoints(loadSavedControlPoints());
    }
  }, [serialMode]);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;

    function loadVoices() {
      setAvailableVoices(window.speechSynthesis.getVoices());
    }

    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.cancel();
      neuralAudioRef.current?.pause();
      stopRadioBed(radioAudioRef);
      window.speechSynthesis.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(savedRadioProfile, radioProfile);
  }, [radioProfile]);

  useEffect(() => {
    if (preferredRadioVoice) {
      window.localStorage.setItem(savedRadioVoice, preferredRadioVoice);
      return;
    }

    window.localStorage.removeItem(savedRadioVoice);
  }, [preferredRadioVoice]);

  useEffect(() => {
    if (!started || complete) return undefined;

    setVisibleLineCount(0);

    if (isDsVoiceMode || isVoiceMode) {
      return undefined;
    }

    let lineIndex = 0;

    const timer = setInterval(() => {
      lineIndex += 1;
      setVisibleLineCount(lineIndex);

      if (lineIndex >= activeTransmission.lines.length) {
        clearInterval(timer);
      }
    }, 900);

    return () => clearInterval(timer);
  }, [
    started,
    complete,
    currentTransmission,
    activeTransmission,
    isDsVoiceMode,
    isVoiceMode,
  ]);

  async function speakTransmission() {
    window.speechSynthesis.cancel();
    neuralAudioRef.current?.pause();
    neuralAudioRef.current = null;
    stopRadioBed(radioAudioRef);
    setRadioLoading(Boolean(neuralRadioEndpoint));

    const speechText = formatRadioVoiceText(
      activeTransmission.voiceLines || activeTransmission.lines
    );

    if (neuralRadioEndpoint) {
      try {
        const response = await fetch(neuralRadioEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: speechText,
            profile: radioProfile,
            voiceKey:
              scenario.correctCheckIn.aircraftCallsign ||
              pendingCheckIn?.aircraftLabel ||
              speechText,
          }),
        });

        if (!response.ok) throw new Error(`Speech request failed: ${response.status}`);

        const audio = new Audio(URL.createObjectURL(await response.blob()));
        audio.playbackRate = getRadioProfile(radioProfile).playbackRate || 1;
        neuralAudioRef.current = audio;
        setRadioLoading(false);
        setRadioPlaying(true);
        setRadioEngine("Google neural voice");
        const radioBed = startRadioBed();
        radioAudioRef.current = radioBed;
        playRadioClick(radioBed, 0.08, 0.055);
        audio.onended = () => finishRadioPlayback(radioBed);
        audio.onerror = () => finishRadioPlayback(radioBed);
        await audio.play();
        return;
      } catch (error) {
        console.warn("Neural radio unavailable; using browser voice.", error);
      }
    }

    setRadioLoading(false);
    speakWithBrowserVoice(speechText);
  }

  function finishRadioPlayback(radioBed) {
    playRadioClick(radioBed, 0.05, 0.045);
    window.setTimeout(() => {
      stopRadioBed(radioAudioRef);
      setRadioPlaying(false);
    }, 140);
  }

  function speakWithBrowserVoice(speechText) {
    if (!window.speechSynthesis) {
      alert("Voice playback is not available in this browser.");
      return;
    }

    const radioBed = startRadioBed();
    radioAudioRef.current = radioBed;
    setRadioPlaying(true);
    setRadioEngine("Browser fallback voice");
    playRadioClick(radioBed, 0.08, 0.055);

    const profile = getRadioProfile(radioProfile);
    const utterance = new SpeechSynthesisUtterance(
      speechText
    );
    utterance.voice = getBestRadioVoice(
      availableVoices,
      radioProfile,
      preferredRadioVoice
    );
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = profile.volume;
    utterance.onend = () => {
      finishRadioPlayback(radioBed);
    };
    utterance.onerror = () => {
      stopRadioBed(radioAudioRef);
      setRadioPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopTransmission() {
    window.speechSynthesis?.cancel();
    neuralAudioRef.current?.pause();
    neuralAudioRef.current = null;
    stopRadioBed(radioAudioRef);
    setRadioLoading(false);
    setRadioPlaying(false);
  }

  function updateField(field, value) {
    setCheckIn({
      ...checkIn,
      [field]: value,
    });
  }

  function startCheckIn() {
    if (serialMode && !pendingCheckIn) {
      alert("No aircraft has been pushed by DS for check-in yet.");
      return;
    }

    if (serialMode && !pendingCheckIn?.routedControlPoint) {
      alert("Route this aircraft to an IP/BP on the map before starting check-in.");
      return;
    }

    const aircraftId = serialMode
      ? pendingCheckIn.aircraftId
      : selectedAircraft;
    const generatedScenario =
      serialMode && pendingCheckIn?.manualScenario
        ? pendingCheckIn.manualScenario
        : generateCheckIn(aircraftId, {
            controllerCallsign: pendingCheckIn?.controllerCallsign,
            direction: pendingCheckIn?.routedControlPoint?.label,
          });
    const newScenario = applyRouteToScenario(generatedScenario, pendingCheckIn);

    setScenario(newScenario);
    setCheckIn(blankCheckIn);
    setStarted(true);
    setCurrentTransmission(0);
    setVisibleLineCount(0);
    setComplete(false);
    setResults(null);
  }

  function nextTransmission() {
    if (currentTransmission < scenario.transmissions.length - 1) {
      setCurrentTransmission(currentTransmission + 1);
    } else {
      setComplete(true);
    }
  }

  function repeatTransmission() {
    setVisibleLineCount(0);

    setTimeout(() => {
      let lineIndex = 0;

      const timer = setInterval(() => {
        lineIndex += 1;
        setVisibleLineCount(lineIndex);

        if (lineIndex >= activeTransmission.lines.length) {
          clearInterval(timer);
        }
      }, 900);
    }, 100);
  }

  function repeatStage(transmissionIndex) {
    window.speechSynthesis?.cancel();
    stopRadioBed(radioAudioRef);
    setRadioPlaying(false);
    setCurrentTransmission(transmissionIndex);
    setComplete(false);
    setResults(null);
    setVisibleLineCount(0);
  }

  function normalise(value) {
    return value.trim().toUpperCase().replace(/\s+/g, " ");
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
      routedAt: new Date().toLocaleTimeString(),
    };

    window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(updatedTasking));
    setPendingCheckIn(updatedTasking);
    setRoutePickerOpen(false);
  }

  function updatePendingRouteAltitude(altitude) {
    if (!pendingCheckIn) return;

    const updatedTasking = {
      ...pendingCheckIn,
      routeAltitude: altitude,
    };

    window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(updatedTasking));
    setPendingCheckIn(updatedTasking);
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

  function addCheckedInPlatform() {
    const newPlatform = {
      id: `${scenario.correctCheckIn.aircraftCallsign}-${Date.now()}`,
      callsign: scenario.correctCheckIn.aircraftCallsign,
      aircraft: scenario.correctCheckIn.aircraftNumberType,
      positionAltitude: scenario.correctCheckIn.positionAltitude,
      playtime: scenario.correctCheckIn.playtime,
      checkedInAt: new Date().toISOString(),
      downlinkCode: scenario.correctCheckIn.downlinkCode,
      capabilities: scenario.correctCheckIn.capabilities,
      status: "CHECKED IN",
      route: pendingCheckIn?.route,
      routeStatus: pendingCheckIn?.routeStatus,
      routedControlPoint: pendingCheckIn?.routedControlPoint,
      routePosition: pendingCheckIn?.routePosition,
      routeAltitude: pendingCheckIn?.routeAltitude,
      routeStartedAt: pendingCheckIn?.routeStartedAt,
      routeEstablishedAt: pendingCheckIn?.routeEstablishedAt,
      inboundStartPosition: pendingCheckIn?.inboundStartPosition,
      anchor: pendingCheckIn?.routePosition,
      extraPlaytimeMinutes: pendingCheckIn?.extraPlaytimeMinutes || 0,
    };

    setPlatforms((currentPlatforms) => [
      ...currentPlatforms.filter(
        (platform) => platform.callsign !== newPlatform.callsign
      ),
      newPlatform,
    ]);

    if (serialMode) {
      window.localStorage.removeItem(savedPendingCheckIn);
      setPendingCheckIn(null);
    }
  }

  function markCheckIn() {
    const checks = [
      ["A/C C/S", "aircraftCallsign"],
      ["Mission Number", "missionNumber"],
      ["Number & Type", "aircraftNumberType"],
      ["Position & Altitude", "positionAltitude"],
      ["Ordnance", "ordnance"],
      ["Playtime", "playtime"],
      ["Capabilities", "capabilities"],
      ["Downlink Code", "downlinkCode"],
      ["Abort Code", "abortCode"],
      ["Remarks", "remarks"],
    ];

    const marked = checks.map(([label, field]) => {
      const userAnswer = normalise(checkIn[field]);
      const correctAnswer = normalise(scenario.correctCheckIn[field]);

      return {
        label,
        field,
        correct: markCheckInField(field, userAnswer, correctAnswer),
        userAnswer,
        correctAnswer,
      };
    });

    const score = Math.round(
      (marked.filter((item) => item.correct).length / marked.length) * 100
    );

    const stageScores = checkInStages.map((stage) => {
      const stageMarked = marked.filter((item) => stage.fields.includes(item.field));
      const correctCount = stageMarked.filter((item) => item.correct).length;
      const stageScore = stageMarked.length
        ? Math.round((correctCount / stageMarked.length) * 100)
        : 0;

      return {
        ...stage,
        correctCount,
        totalCount: stageMarked.length,
        score: stageScore,
      };
    });

    setResults({ marked, score, stageScores });

    if (score >= 70) {
      addCheckedInPlatform();
    }
  }

  function removePlatform(platformId) {
    setPlatforms((currentPlatforms) =>
      currentPlatforms.filter((platform) => platform.id !== platformId)
    );
  }

  return (
    <main className="kneeboardPage">
      <div className="pageBackRow">
        {serialMode ? (
          <SerialWorkflowNav onNavigate={onNavigate} />
        ) : (
          <button onClick={() => onNavigate("home")}>Home</button>
        )}
      </div>

      <section className="kneeboardCard">
        <div className="kneeboardHeader">
          <div>
            <h1>CHECK-IN SLATE CARD</h1>
            <p>JTAC / TACP Aircraft Check-In</p>
          </div>

          <div className={`transmitStatus ${started ? "receiving" : ""}`}>
            <span></span>
            {started && !complete
              ? "RECEIVING"
              : complete
              ? "CHECK-IN COMPLETE"
              : "STANDBY"}
          </div>
        </div>

        {!serialMode && (
        <div className="modeToggle">
          <button
            className={guidedMode ? "activeMode" : ""}
            onClick={() => setGuidedMode(true)}
          >
            Guided Mode
          </button>

          <button
            className={!guidedMode ? "activeMode" : ""}
            onClick={() => setGuidedMode(false)}
          >
            Assessment Mode
          </button>
        </div>
        )}

        <div className="radioPanel">
          {!started && (
            <>
              <h2>RADIO CHECK-IN TRAINER</h2>

              {serialMode && pendingCheckIn && (
                <div className="serialCard checkInAlert">
                  <small>DS pushed aircraft</small>
                  <p>
                    {pendingCheckIn.aircraftLabel} ready for check-in. Answer callsign{" "}
                    {pendingCheckIn.controllerCallsign}. Delivery:{" "}
                    {pendingCheckIn.deliveryLabel || "Generated text"}.
                  </p>
                  <p>
                    Route:{" "}
                    {pendingCheckIn.routeStatus ||
                      "Route aircraft to an IP/BP before check-in."}
                  </p>
                  {!pendingCheckIn.routedControlPoint && (
                    <button onClick={() => setRoutePickerOpen(true)}>
                      Route Aircraft
                    </button>
                  )}
                </div>
              )}

              {!serialMode && (
              <label>
                Aircraft / Platform
                <select
                  value={selectedAircraft}
                  onChange={(e) => setSelectedAircraft(e.target.value)}
                >
                  <option value="random">Random Platform</option>
                  {aircraftOptions.map((aircraft) => (
                    <option key={aircraft.id} value={aircraft.id}>
                      {aircraft.label}
                    </option>
                  ))}
                </select>
              </label>
              )}

              {!serialMode && (
                <label>
                  Delivery Mode
                  <select
                    value={deliveryMode}
                    onChange={(event) => setDeliveryMode(event.target.value)}
                  >
                    {deliveryOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {activeDeliveryMode === "generatedRadio" && (
                <div className="radioVoiceControls">
                  <label>
                    Radio Voice Style
                    <select
                      value={radioProfile}
                      onChange={(event) => setRadioProfile(event.target.value)}
                    >
                      {radioVoiceProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Installed Voice
                    <select
                      value={preferredRadioVoice}
                      onChange={(event) =>
                        setPreferredRadioVoice(event.target.value)
                      }
                    >
                      <option value="">Auto select natural voice</option>
                      {availableVoices
                        .filter((voice) => /^en/i.test(voice.lang))
                        .map((voice) => (
                          <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                            {voice.name} / {voice.lang}
                          </option>
                        ))}
                    </select>
                  </label>

                  <small>
                    {neuralRadioEndpoint
                      ? "Google neural radio enabled; browser voice is the automatic fallback."
                      : "Browser voice active until the Google speech endpoint is configured."}
                  </small>
                </div>
              )}

              <p>
                Press start. A new aircraft check-in will be generated each
                time. Fill the slate card while the transmission is coming in,
                then mark your answers.
              </p>

              <button onClick={startCheckIn}>Start Check-In</button>
            </>
          )}

          {started && !complete && (
            <>
              <h2>{activeTransmission.title}</h2>

              {isDsVoiceMode ? (
                <div className="radioText voiceModePanel">
                  <p>DS LOCAL VOICE MODE</p>
                  <p>
                    Listen to the DS / aircraft voice locally and complete the
                    slate card. No generated check-in text is shown.
                  </p>
                </div>
              ) : isVoiceMode ? (
                <div className="radioText voiceModePanel">
                  <p>
                    {radioLoading
                      ? "GENERATING NEURAL RADIO"
                      : radioPlaying
                        ? "RADIO TRANSMITTING"
                        : "GENERATED RADIO VOICE READY"}
                  </p>
                  <p>
                    {radioLoading
                      ? "Preparing the aircraft transmission..."
                      : radioPlaying
                      ? `Monitor the radio call and complete the slate card from audio. ${radioEngine}`
                      : "Use Play Radio Voice, then complete the slate card from audio."}
                  </p>
                </div>
              ) : (
                <div className="radioText">
                  {activeTransmission.lines
                    .slice(0, visibleLineCount)
                    .map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                </div>
              )}

              <div className="radioControls">
                {isVoiceMode && (
                  <>
                    <button onClick={speakTransmission}>
                      {radioLoading
                        ? "Generating Radio..."
                        : radioPlaying
                          ? "Replay Radio Voice"
                          : "Play Radio Voice"}
                    </button>
                    {(radioPlaying || radioLoading) && (
                      <button onClick={stopTransmission}>Stop Radio</button>
                    )}
                  </>
                )}
                {!isDsVoiceMode && !isVoiceMode && (
                  <button onClick={repeatTransmission}>Repeat Last</button>
                )}
                <button
                  onClick={isDsVoiceMode ? () => setComplete(true) : nextTransmission}
                >
                  {isDsVoiceMode
                    ? "End DS Voice Check-In"
                    : currentTransmission === scenario.transmissions.length - 1
                      ? "End Check-In"
                      : "Next Transmission"}
                </button>
              </div>
            </>
          )}

          {complete && (
            <>
              <h2>END OF CHECK-IN</h2>
              <p>Complete any missing fields, then mark your slate card.</p>

              <div className="radioControls">
                <button onClick={() => setComplete(false)}>
                  Review Transmissions
                </button>
                <button onClick={markCheckIn}>Mark Check-In</button>
                {serialMode && isDsVoiceMode && (
                  <button onClick={addCheckedInPlatform}>
                    DS Authority Accept
                  </button>
                )}
                {!serialMode && (
                  <button onClick={startCheckIn}>New Check-In</button>
                )}
              </div>
            </>
          )}
        </div>

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
                    pendingCheckIn.aircraftLabel || pendingCheckIn.aircraftId
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

        <div className="kneeboardSection">
          <h2>AIRCRAFT</h2>

          <label>
            A/C C/S
            <input
              value={checkIn.aircraftCallsign}
              onChange={(e) =>
                updateField("aircraftCallsign", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter aircraft callsign" : ""}
            />
          </label>

          <label>
            Mission Number
            <input
              value={checkIn.missionNumber}
              onChange={(e) =>
                updateField("missionNumber", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter mission number" : ""}
            />
          </label>

          <label>
            Number & Type of A/C
            <input
              value={checkIn.aircraftNumberType}
              onChange={(e) =>
                updateField("aircraftNumberType", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter number and type" : ""}
            />
          </label>
        </div>

        <div className="kneeboardSection">
          <h2>POSITION</h2>

          <label>
            Position & Altitude
            <input
              value={checkIn.positionAltitude}
              onChange={(e) =>
                updateField("positionAltitude", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter position and altitude" : ""}
            />
          </label>
        </div>

        <div className="kneeboardSection">
          <h2>ORDNANCE / PLAYTIME</h2>

          <label>
            Ordnance
            <textarea
              value={checkIn.ordnance}
              onChange={(e) =>
                updateField("ordnance", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter ordnance" : ""}
            />
          </label>

          <label>
            Playtime / Time on Station
            <input
              value={checkIn.playtime}
              onChange={(e) =>
                updateField("playtime", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter playtime" : ""}
            />
          </label>
        </div>

        <div className="kneeboardSection">
          <h2>CAPABILITIES</h2>

          <label>
            Capabilities
            <textarea
              value={checkIn.capabilities}
              onChange={(e) =>
                updateField("capabilities", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter capabilities" : ""}
            />
          </label>

          <label>
            Downlink Code
            <input
              value={checkIn.downlinkCode}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "");
                if (value.length <= 4) {
                  updateField("downlinkCode", value);
                }
              }}
              placeholder={guidedMode ? "4 digits" : ""}
            />
          </label>
        </div>

        <div className="kneeboardSection">
          <h2>CONTROL</h2>

          <label>
            Abort Code
            <input
              value={checkIn.abortCode}
              onChange={(e) =>
                updateField("abortCode", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter abort code" : ""}
            />
          </label>

          <label>
            Remarks
            <textarea
              value={checkIn.remarks}
              onChange={(e) =>
                updateField("remarks", e.target.value.toUpperCase())
              }
              placeholder={guidedMode ? "Enter remarks" : ""}
            />
          </label>
        </div>

        {results && (
          <div className="resultsPanel">
            <h2>CHECK-IN SCORE: {results.score}%</h2>
            {results.score < 70 && (
              <div className="retryPanel">
                <strong>Below 70% - repeat a stage before re-marking.</strong>
                <div className="stageRetryGrid">
                  {results.stageScores.map((stage) => (
                    <button
                      key={stage.label}
                      className={stage.score >= 70 ? "stagePassed" : "stageNeedsRepeat"}
                      onClick={() => repeatStage(stage.transmissionIndex)}
                    >
                      <span>{stage.label}</span>
                      <small>
                        {stage.correctCount}/{stage.totalCount} correct
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.marked.map((item) => (
              <div
                key={item.field}
                className={`resultRow ${
                  item.correct ? "correct" : "incorrect"
                }`}
              >
                <span>{item.label}</span>
                <strong>{item.correct ? "PASS" : "CHECK"}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="platformMonitor">
          <h2>AIR PICTURE / PLATFORMS</h2>

          {platforms.length === 0 && (
            <p className="emptyText">No aircraft checked in yet.</p>
          )}

          {platforms.map((platform) => (
            <div key={platform.id} className="platformCard">
              <strong>{platform.callsign}</strong>
              <span>{platform.aircraft}</span>
              <small>{platform.positionAltitude}</small>
              <small>PLAYTIME: {platform.playtime}</small>
              <small>DL: {platform.downlinkCode}</small>
              <small>{platform.status}</small>
              <button
                className="removePlatform"
                onClick={() => removePlatform(platform.id)}
              >
                Check Out
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function getInboundStartPosition(routePosition) {
  return offsetPosition(routePosition, -42000, -22000);
}

function isRotaryWingAircraft(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  return ["APACHE", "AH-64", "TIGER", "AH-1", "COBRA", "HELI"].some((term) =>
    normalisedAircraft.includes(term)
  );
}

function isUavAircraft(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  return ["MQ-9", "REAPER", "WATCHKEEPER", "UAV", "RPAS"].some((term) =>
    normalisedAircraft.includes(term)
  );
}

function getDefaultRouteAltitude(aircraft = "") {
  if (isRotaryWingAircraft(aircraft)) {
    return "1000 FT";
  }

  if (isUavAircraft(aircraft)) {
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

function getControlPointRoleForAircraft(aircraft = "") {
  if (isRotaryWingAircraft(aircraft)) {
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
