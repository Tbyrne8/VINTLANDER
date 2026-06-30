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

export default function CheckIn() {
  const [selectedAircraft, setSelectedAircraft] = useState("random");
  const [scenario, setScenario] = useState(firstScenario);
  const [checkIn, setCheckIn] = useState(blankCheckIn);
  const [started, setStarted] = useState(false);
  const [currentTransmission, setCurrentTransmission] = useState(0);
  const [visibleLineCount, setVisibleLineCount] = useState(0);
  const [complete, setComplete] = useState(false);
  const [results, setResults] = useState(null);
  const [guidedMode, setGuidedMode] = useState(true);
  const [platforms, setPlatforms] = useState([]);

  const aircraftOptions = getAircraftOptions();
  const activeTransmission = scenario.transmissions[currentTransmission];

  useEffect(() => {
    if (!started || complete) return;

    setVisibleLineCount(0);

    let lineIndex = 0;

    const timer = setInterval(() => {
      lineIndex += 1;
      setVisibleLineCount(lineIndex);

      if (lineIndex >= activeTransmission.lines.length) {
        clearInterval(timer);
      }
    }, 900);

    return () => clearInterval(timer);
  }, [started, complete, currentTransmission, activeTransmission]);

  function updateField(field, value) {
    setCheckIn({
      ...checkIn,
      [field]: value,
    });
  }

  function startCheckIn() {
    const newScenario = generateCheckIn(selectedAircraft);

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
      const newPlatform = {
        id: `${scenario.correctCheckIn.aircraftCallsign}-${Date.now()}`,
        callsign: scenario.correctCheckIn.aircraftCallsign,
        aircraft: scenario.correctCheckIn.aircraftNumberType,
        positionAltitude: scenario.correctCheckIn.positionAltitude,
        playtime: scenario.correctCheckIn.playtime,
        downlinkCode: scenario.correctCheckIn.downlinkCode,
        capabilities: scenario.correctCheckIn.capabilities,
        status: "CHECKED IN",
      };

      setPlatforms([...platforms, newPlatform]);
    }
  }

  return (
    <main className="kneeboardPage">
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

        <div className="radioPanel">
          {!started && (
            <>
              <h2>RADIO CHECK-IN TRAINER</h2>

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

              <div className="radioText">
                {activeTransmission.lines
                  .slice(0, visibleLineCount)
                  .map((line, index) => (
                    <p key={`${line}-${index}`}>{line}</p>
                  ))}
              </div>

              <div className="radioControls">
                <button onClick={repeatTransmission}>Repeat Last</button>
                <button onClick={nextTransmission}>
                  {currentTransmission === scenario.transmissions.length - 1
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
                <button onClick={startCheckIn}>New Check-In</button>
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
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}