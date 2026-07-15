export const savedMissionEvents = "vintlander.missionEvents";

export function loadMissionEvents() {
  try {
    const saved = window.localStorage.getItem(savedMissionEvents);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function recordMissionEvent({
  type = "mission",
  title,
  detail = "",
  data = null,
  severity = "info",
}) {
  const event = {
    id: `EVENT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    timeLabel: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    type,
    title,
    detail,
    data,
    severity,
  };
  const events = [event, ...loadMissionEvents()].slice(0, 300);
  window.localStorage.setItem(savedMissionEvents, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent("vintlander:mission-event", { detail: event }));
  return events;
}

export function clearMissionEvents() {
  window.localStorage.removeItem(savedMissionEvents);
  window.dispatchEvent(new CustomEvent("vintlander:mission-events-cleared"));
}
