import { useEffect, useMemo, useState } from "react";
import AttackRunMap from "./AttackRunMap.jsx";

const injects = [
  { id: "wrongReadback", label: "Wrong Readback", severity: "warning" },
  { id: "lostLaser", label: "Lost Laser", severity: "warning" },
  { id: "hungWeapon", label: "Hung Weapon", severity: "critical" },
  { id: "lowFuel", label: "Low Fuel", severity: "warning" },
  { id: "civilian", label: "Civilian Movement", severity: "critical" },
  { id: "threat", label: "Pop-up Threat", severity: "critical" },
];

function buildSummary(events) {
  const count = (pattern) =>
    events.filter((event) => pattern.test(`${event.title} ${event.detail}`)).length;
  return {
    total: events.length,
    readbackErrors: count(/incorrect|wrong readback/i),
    aborts: count(/abort|hung weapon|lost laser/i),
    releases: count(/weapon away/i),
    hits: count(/effective hit|outcome: hit/i),
    misses: count(/miss|re-attack required/i),
  };
}

export default function DsMissionControl({
  events,
  attackStatus,
  linkedBrief,
  platform,
  onInject,
  onForceOutcome,
  onTogglePause,
  onAccelerate,
  onClearEvents,
}) {
  const [filter, setFilter] = useState("all");
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const replayEvents = useMemo(
    () =>
      [...events]
        .reverse()
        .filter((event) => event.data?.attackStatus?.attackTarget),
    [events]
  );
  const filteredEvents =
    filter === "all" ? events : events.filter((event) => event.type === filter);
  const summary = buildSummary(events);
  const replayEvent = replayEvents[Math.min(replayIndex, Math.max(0, replayEvents.length - 1))];
  const replayStatus = replayEvent?.data?.attackStatus || attackStatus;

  useEffect(() => {
    if (!replaying || replayEvents.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setReplayIndex((current) => {
        if (current >= replayEvents.length - 1) {
          setReplaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1700);
    return () => window.clearInterval(timer);
  }, [replaying, replayEvents.length]);

  function exportDebrief() {
    const blob = new Blob(
      [JSON.stringify({ exportedAt: new Date().toISOString(), summary, events }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vintlander-debrief-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card dsMissionControl">
      <div className="dsControlHeader">
        <div>
          <small>Instructor-only controls</small>
          <h2>DS Mission Control</h2>
        </div>
        <span className={attackStatus.pausedAt ? "statusPill warning" : "statusPill ready"}>
          {attackStatus.pausedAt ? "PAUSED" : "LIVE"}
        </span>
      </div>

      <div className="dsMetricGrid">
        <div><span>Events</span><strong>{summary.total}</strong></div>
        <div><span>Readback errors</span><strong>{summary.readbackErrors}</strong></div>
        <div><span>Aborts</span><strong>{summary.aborts}</strong></div>
        <div><span>Releases</span><strong>{summary.releases}</strong></div>
        <div><span>Hits</span><strong>{summary.hits}</strong></div>
        <div><span>Misses</span><strong>{summary.misses}</strong></div>
      </div>

      <div className="dsControlGrid">
        <div className="serialCard">
          <small>Live injects</small>
          <div className="dsInjectGrid">
            {injects.map((inject) => (
              <button
                key={inject.id}
                className={inject.severity === "critical" ? "dangerButton" : ""}
                onClick={() => onInject(inject.id)}
              >
                {inject.label}
              </button>
            ))}
          </div>
        </div>

        <div className="serialCard">
          <small>Attack outcome</small>
          <div className="dsInjectGrid">
            <button onClick={() => onForceOutcome("hit")}>Force Hit</button>
            <button onClick={() => onForceOutcome("near miss")}>Force Near Miss</button>
            <button onClick={() => onForceOutcome("miss")}>Force Miss</button>
          </div>
        </div>

        <div className="serialCard">
          <small>Simulation timing</small>
          <div className="dsInjectGrid">
            <button onClick={onTogglePause}>
              {attackStatus.pausedAt ? "Resume" : "Pause"}
            </button>
            <button onClick={() => onAccelerate(0.5)}>2X Remaining</button>
            <button onClick={() => onAccelerate(0.2)}>5X Remaining</button>
          </div>
        </div>
      </div>

      {(linkedBrief || replayStatus?.attackTarget) && (
        <div className="dsReplayPanel">
          <div className="dsReplayHeader">
            <div>
              <small>After-action map replay</small>
              <strong>{replayEvent?.title || attackStatus.phase}</strong>
            </div>
            <div className="briefActions">
              <button
                disabled={!replayEvents.length}
                onClick={() => {
                  setReplayIndex(0);
                  setReplaying(true);
                }}
              >
                Play Replay
              </button>
              <button disabled={!replayEvents.length} onClick={() => setReplaying(false)}>
                Pause Replay
              </button>
            </div>
          </div>
          {replayEvents.length > 0 && (
            <input
              className="dsReplaySlider"
              type="range"
              min="0"
              max={Math.max(0, replayEvents.length - 1)}
              value={Math.min(replayIndex, replayEvents.length - 1)}
              onChange={(event) => {
                setReplaying(false);
                setReplayIndex(Number(event.target.value));
              }}
            />
          )}
          <AttackRunMap
            attackStatus={replayStatus}
            brief={replayEvent?.data?.brief || linkedBrief}
            platform={replayStatus?.attackPlatform || platform}
          />
        </div>
      )}

      <div className="dsTimelineHeader">
        <div className="briefActions">
          {["all", "checkin", "routing", "nine-line", "attack", "inject", "bda"].map((type) => (
            <button
              key={type}
              className={filter === type ? "activeMode" : ""}
              onClick={() => setFilter(type)}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="briefActions">
          <button onClick={exportDebrief}>Export Debrief</button>
          <button className="dangerButton" onClick={onClearEvents}>Clear Timeline</button>
        </div>
      </div>

      <div className="dsTimeline">
        {!filteredEvents.length && <p className="emptyText">No mission events recorded yet.</p>}
        {filteredEvents.map((event) => (
          <article key={event.id} className={`dsTimelineEvent ${event.severity}`}>
            <time>{event.timeLabel}</time>
            <div>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </div>
            <small>{event.type.toUpperCase()}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
