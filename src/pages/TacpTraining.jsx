import { useEffect, useMemo, useState } from "react";
import { getAircraftOptions } from "../utils/checkInGenerator.js";

const savedTrainingLogs = "vintlander.trainingLogs";
const savedCallsigns = "vintlander.controllerCallsigns";

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

export default function TacpTraining({ platforms = [] }) {
  const [logs, setLogs] = useState(() => loadSavedList(savedTrainingLogs));
  const [selectedAircraft, setSelectedAircraft] = useState("random");
  const [completedTasks, setCompletedTasks] = useState({});
  const [controller, setController] = useState(defaultController);
  const [debrief, setDebrief] = useState("");
  const [activeView, setActiveView] = useState("trainee");
  const [callsigns, setCallsigns] = useState(() => {
    const saved = loadSavedList(savedCallsigns);
    return saved.length ? saved : getDefaultCallsigns();
  });
  const [newCallsign, setNewCallsign] = useState("");
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
    window.localStorage.setItem(savedCallsigns, JSON.stringify(callsigns));
  }, [callsigns]);

  const aircraftChoices = useMemo(
    () => [
      { id: "random", label: "Random aircraft" },
      ...getAircraftOptions().map((aircraft) => ({
        id: `type:${aircraft.id}`,
        label: aircraft.label,
      })),
      ...platforms.map((platform) => ({
        id: `platform:${platform.id}`,
        label: `${platform.callsign} - ${platform.aircraft}`,
      })),
    ],
    [platforms]
  );

  const selectedPlatform = selectedAircraft.startsWith("platform:")
    ? platforms.find((platform) => `platform:${platform.id}` === selectedAircraft)
    : null;
  const selectedAircraftLabel =
    aircraftChoices.find((aircraft) => aircraft.id === selectedAircraft)?.label ||
    "Random aircraft";

  const totalTasks = serialPhases.reduce(
    (sum, phase) => sum + phase.tasks.length,
    0
  );
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progress = Math.round((completedCount / totalTasks) * 100);

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
    setActiveView("trainee");
  }

  function pushThreatsAndRestrictions() {
    setController((current) => ({
      ...current,
      threats: `${situationTemplate.threatType} ${situationTemplate.enemyActivity}`,
      restrictions: `${situationTemplate.restrictionType} ${situationTemplate.controlMeasure}`,
    }));
    setActiveView("trainee");
  }

  function toggleTask(phaseId, taskIndex) {
    const key = getTaskKey(phaseId, taskIndex);
    setCompletedTasks((current) => ({ ...current, [key]: !current[key] }));
  }

  function resetSerial() {
    setCompletedTasks({});
    setDebrief("");
    setController(defaultController);
  }

  function saveTrainingLog() {
    const entry = {
      id: `SERIAL-${Date.now()}`,
      createdAt: getTimestamp(),
      progress,
      controller,
      debrief,
      aircraftSelection: selectedAircraftLabel,
      platform: selectedPlatform || null,
    };

    setLogs((current) => [entry, ...current].slice(0, 10));
  }

  function deleteLog(id) {
    setLogs((current) => current.filter((log) => log.id !== id));
  }

  return (
    <main className="page trainingPage">
      <header className="pageHeader">
        <div>
          <h1>TACP Mission Trainer</h1>
          <p>Run a complete serial from aircraft check-in through effects and BDA.</p>
        </div>
        <span className={progress === 100 ? "statusPill ready" : "statusPill"}>
          SERIAL {progress}% COMPLETE
        </span>
      </header>

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
      </div>

      {activeView === "trainee" && (
        <>
      <section className="trainingGrid">
        <div className="card serialControl">
          <h2>Situation Update</h2>
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
          <label className="field">
            Target development tasking
            <textarea
              value={controller.targetDevelopment}
              onChange={(event) =>
                updateController("targetDevelopment", event.target.value)
              }
            />
          </label>

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
    </main>
  );
}
