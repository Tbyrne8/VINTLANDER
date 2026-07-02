import { useEffect, useState } from "react";
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
const deliveryOptions = [
  { id: "generatedText", label: "Generated text" },
  { id: "generatedRadio", label: "Generated radio voice" },
  { id: "dsVoice", label: "DS local voice" },
];
const heightBlockOptions = Array.from({ length: 30 }, (_, index) => {
  const feet = (index + 1) * 1000;
  return `${feet} FT`;
});

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

  function speakTransmission() {
    if (!window.speechSynthesis) {
      alert("Voice playback is not available in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      (activeTransmission.voiceLines || activeTransmission.lines).join(". ")
    );
    utterance.rate = 0.86;
    utterance.pitch = 0.82;
    utterance.volume = 0.95;
    window.speechSynthesis.speak(utterance);
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

    setResults({ marked, score });

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
                  <p>GENERATED RADIO VOICE READY</p>
                  <p>Use Play Radio Voice, then complete the slate card from audio.</p>
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
                  <button onClick={speakTransmission}>Play Radio Voice</button>
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
