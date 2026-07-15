import { Marker } from "@vis.gl/react-google-maps";
import AirPlatformMarker from "./AirPlatformMarker.jsx";
import PendingRouteLine from "./PendingRouteLine.jsx";
import { getAttackRunGeometry } from "../utils/attackRun.js";

function weaponIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42"><path d="M21 2 L27 17 L40 21 L27 25 L21 40 L15 25 L2 21 L15 17 Z" fill="#ffd34e" stroke="#ffffff" stroke-width="2"/><circle cx="21" cy="21" r="4" fill="#ff6b00"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: { x: 21, y: 21 },
  };
}

function impactIcon(outcome = "hit") {
  const colour = outcome === "hit" ? "#ff3b30" : outcome === "near miss" ? "#ffb020" : "#d946ef";
  const label = outcome === "hit" ? "HIT" : outcome === "near miss" ? "NEAR" : "MISS";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="82" height="72" viewBox="0 0 82 72"><circle cx="41" cy="31" r="25" fill="${colour}" fill-opacity="0.2" stroke="${colour}" stroke-width="3"/><circle cx="41" cy="31" r="11" fill="${colour}" fill-opacity="0.75"/><path d="M41 2 L45 20 L62 10 L52 25 L78 31 L52 37 L62 52 L45 42 L41 64 L37 42 L20 52 L30 37 L4 31 L30 25 L20 10 L37 20 Z" fill="${colour}" fill-opacity="0.7"/><text x="41" y="70" fill="white" text-anchor="middle" font-family="Arial" font-size="10" font-weight="800">${label}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: { x: 41, y: 31 },
  };
}

export default function AttackRunMarkers({ attackStatus, brief, platform, now }) {
  const geometry = getAttackRunGeometry(attackStatus, brief, platform, now);
  if (!geometry || !attackStatus?.attackPlatform) return null;

  return (
    <>
      <PendingRouteLine from={geometry.routeFrom} to={geometry.routeTo} />
      <AirPlatformMarker
        platform={{
          ...attackStatus.attackPlatform,
          position: geometry.aircraftPosition,
          altitude: attackStatus.phase,
          mode: attackStatus.phase,
        }}
      />
      {geometry.weaponPosition && (
        <Marker position={geometry.weaponPosition} icon={weaponIcon()} />
      )}
      {geometry.impactVisible && (
        <Marker
          position={geometry.impactPosition}
          icon={impactIcon(attackStatus.weaponOutcome)}
        />
      )}
    </>
  );
}
