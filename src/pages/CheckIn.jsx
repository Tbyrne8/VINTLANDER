import { useEffect, useState } from "react";
import {
  generateCheckIn,
  getAircraftOptions,
} from "../utils/checkInGenerator.js";
import { markCheckInField } from "../utils/checkInMarking.js";

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
const deliveryOptions = [
  { id: "generatedText", label: "Generated text" },
  { id: "generatedRadio", label: "Generated radio voice" },
  { id: "dsVoice", label: "DS local voice" },
];

function loadPendingCheckIn() {
  try {
    const saved = window.localStorage.getItem(savedPendingCheckIn);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
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

    const aircraftId = serialMode
      ? pendingCheckIn.aircraftId
      : selectedAircraft;
    const newScenario =
      serialMode && pendingCheckIn?.manualScenario
        ? pendingCheckIn.manualScenario
        : generateCheckIn(aircraftId, {
            controllerCallsign: pendingCheckIn?.controllerCallsign,
          });

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
