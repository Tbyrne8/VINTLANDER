import { useEffect, useMemo, useState } from "react";

const savedTargets = "vintlander.targets";
const savedBriefs = "vintlander.attackBriefs";

const defaultBrief = {
  ipBp: "CURRENT HOLD",
  heading: "AS REQUIRED",
  distance: "AS REQUIRED",
  elevation: "UNKNOWN",
  mark: "TALK-ON",
  friendlies: "UNKNOWN",
  egress: "AS DIRECTED",
  controlType: "TYPE 2",
  attackMethod: "BOT",
  restrictions: "CLEARED HOT ON CONTROL ONLY",
  remarks: "",
};

function loadSavedList(key) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getNowStamp() {
  return new Date().toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTargetLocation(target) {
  return target?.mgrs || "NO GRID SAVED";
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
    ["6", "Target location", formatTargetLocation(target)],
    ["7", "Mark", brief.mark],
    ["8", "Friendlies", brief.friendlies],
    ["9", "Egress", brief.egress],
  ];
}

function formatBriefText(platform, target, brief, lines) {
  const aircraft = platform
    ? `${platform.callsign || "NO CALLSIGN"} / ${platform.aircraft || "UNKNOWN AIRCRAFT"}`
    : "NO PLATFORM SELECTED";

  return [
    "VINTLANDER 9-LINE / TACAM",
    `Aircraft: ${aircraft}`,
    `Control: ${brief.controlType}`,
    `Attack method: ${brief.attackMethod}`,
    `Target: ${target?.id || "NO TARGET"} ${getTargetDescription(target)}`,
    "",
    ...lines.map(([number, label, value]) => `${number}. ${label}: ${value || "UNKNOWN"}`),
    "",
    `Restrictions: ${brief.restrictions || "NONE"}`,
    `Remarks: ${brief.remarks || "NONE"}`,
  ].join("\n");
}

export default function NineLine({ platforms = [] }) {
  const [targets, setTargets] = useState(() => loadSavedList(savedTargets));
  const [briefs, setBriefs] = useState(() => loadSavedList(savedBriefs));
  const [selectedPlatformId, setSelectedPlatformId] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [brief, setBrief] = useState(defaultBrief);
  const [readbackConfirmed, setReadbackConfirmed] = useState(false);

  useEffect(() => {
    setTargets(loadSavedList(savedTargets));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(savedBriefs, JSON.stringify(briefs));
  }, [briefs]);

  useEffect(() => {
    if (!selectedPlatformId && platforms.length) {
      setSelectedPlatformId(platforms[0].id);
    }
  }, [platforms, selectedPlatformId]);

  useEffect(() => {
    if (!selectedTargetId && targets.length) {
      setSelectedTargetId(targets[0].id);
    }
  }, [targets, selectedTargetId]);

  const selectedPlatform = platforms.find(
    (platform) => platform.id === selectedPlatformId
  );
  const selectedTarget = targets.find((target) => target.id === selectedTargetId);

  const nineLines = useMemo(
    () => buildNineLine(brief, selectedTarget),
    [brief, selectedTarget]
  );

  function updateBrief(field, value) {
    setBrief((current) => ({ ...current, [field]: value }));
    setReadbackConfirmed(false);
  }

  async function copyBrief() {
    const text = formatBriefText(selectedPlatform, selectedTarget, brief, nineLines);
    try {
      await navigator.clipboard.writeText(text);
      alert("9-Line copied");
    } catch {
      alert(text);
    }
  }

  function saveBrief() {
    if (!selectedPlatform || !selectedTarget) {
      alert("Select a checked-in platform and a saved target first.");
      return;
    }

    const savedBrief = {
      id: `ATTACK-${Date.now()}`,
      createdAt: getNowStamp(),
      readbackConfirmed,
      platform: {
        callsign: selectedPlatform.callsign,
        aircraft: selectedPlatform.aircraft,
        positionAltitude: selectedPlatform.positionAltitude,
        capabilities: selectedPlatform.capabilities,
      },
      target: selectedTarget,
      brief,
      lines: nineLines,
    };

    setBriefs((current) => [savedBrief, ...current].slice(0, 12));
  }

  function deleteBrief(id) {
    setBriefs((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="page nineLinePage">
      <header className="pageHeader">
        <div>
          <h1>9-Line / TACAM Trainer</h1>
          <p>Build a live attack brief from checked-in aircraft and saved targets.</p>
        </div>
        <span className={readbackConfirmed ? "statusPill ready" : "statusPill"}>
          {readbackConfirmed ? "READBACK CONFIRMED" : "READBACK PENDING"}
        </span>
      </header>

      <section className="briefGrid">
        <div className="card briefBuilder">
          <h2>Mission Setup</h2>

          <label className="field">
            Air platform
            <select
              value={selectedPlatformId}
              onChange={(event) => setSelectedPlatformId(event.target.value)}
            >
              {!platforms.length && <option value="">No checked-in platforms</option>}
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
              value={selectedTargetId}
              onChange={(event) => setSelectedTargetId(event.target.value)}
            >
              {!targets.length && <option value="">No saved targets</option>}
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.id} - {target.description || target.type}
                </option>
              ))}
            </select>
          </label>

          <div className="grid compactGrid">
            <label className="field">
              Control type
              <select
                value={brief.controlType}
                onChange={(event) => updateBrief("controlType", event.target.value)}
              >
                <option>TYPE 1</option>
                <option>TYPE 2</option>
                <option>TYPE 3</option>
              </select>
            </label>

            <label className="field">
              Attack method
              <select
                value={brief.attackMethod}
                onChange={(event) => updateBrief("attackMethod", event.target.value)}
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
                value={brief.ipBp}
                onChange={(event) => updateBrief("ipBp", event.target.value)}
              />
            </label>

            <label className="field">
              Mark
              <select
                value={brief.mark}
                onChange={(event) => updateBrief("mark", event.target.value)}
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
                value={brief.heading}
                onChange={(event) => updateBrief("heading", event.target.value)}
              />
            </label>

            <label className="field">
              Distance
              <input
                value={brief.distance}
                onChange={(event) => updateBrief("distance", event.target.value)}
              />
            </label>
          </div>

          <div className="grid compactGrid">
            <label className="field">
              Target elevation
              <input
                value={brief.elevation}
                onChange={(event) => updateBrief("elevation", event.target.value)}
              />
            </label>

            <label className="field">
              Egress
              <input
                value={brief.egress}
                onChange={(event) => updateBrief("egress", event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            Friendlies
            <input
              value={brief.friendlies}
              onChange={(event) => updateBrief("friendlies", event.target.value)}
            />
          </label>

          <label className="field">
            Restrictions
            <textarea
              value={brief.restrictions}
              onChange={(event) => updateBrief("restrictions", event.target.value)}
            />
          </label>

          <label className="field">
            Remarks
            <textarea
              value={brief.remarks}
              onChange={(event) => updateBrief("remarks", event.target.value)}
              placeholder="Threats, final attack heading, abort code, laser code, TOT..."
            />
          </label>
        </div>

        <div className="card briefPreview">
          <h2>Attack Brief</h2>

          <div className="dataRow">
            <span>Aircraft</span>
            <strong>
              {selectedPlatform
                ? `${selectedPlatform.callsign} / ${selectedPlatform.aircraft}`
                : "NONE"}
            </strong>
          </div>
          <div className="dataRow">
            <span>Position / height</span>
            <strong>{selectedPlatform?.positionAltitude || "UNKNOWN"}</strong>
          </div>
          <div className="dataRow">
            <span>Capabilities</span>
            <strong>{selectedPlatform?.capabilities || "UNKNOWN"}</strong>
          </div>
          <div className="dataRow">
            <span>Target</span>
            <strong>
              {selectedTarget ? `${selectedTarget.id} / ${selectedTarget.type}` : "NONE"}
            </strong>
          </div>

          <div className="nineLineList">
            {nineLines.map(([number, label, value]) => (
              <article key={label} className="lineCard">
                <span>{number}</span>
                <div>
                  <small>{label}</small>
                  <strong>{value || "UNKNOWN"}</strong>
                </div>
              </article>
            ))}
          </div>

          <div className="briefActions">
            <button onClick={() => setReadbackConfirmed((current) => !current)}>
              {readbackConfirmed ? "Mark Readback Pending" : "Confirm Readback"}
            </button>
            <button onClick={copyBrief}>Copy Brief</button>
            <button onClick={saveBrief}>Save Attack Brief</button>
          </div>
        </div>
      </section>

      <section className="card attackHistory">
        <h2>Saved Attack Briefs</h2>
        {!briefs.length ? (
          <p className="emptyText">No attack briefs saved yet.</p>
        ) : (
          briefs.map((item) => (
            <article key={item.id} className="savedBrief">
              <div>
                <strong>
                  {item.platform.callsign} onto {item.target.id}
                </strong>
                <span>
                  {item.createdAt} / {item.brief.controlType} /{" "}
                  {item.readbackConfirmed ? "readback confirmed" : "readback pending"}
                </span>
              </div>
              <button className="removePlatform" onClick={() => deleteBrief(item.id)}>
                Delete
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
