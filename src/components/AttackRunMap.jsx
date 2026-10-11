import { useEffect, useState } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import TargetMarkers from "./TargetMarkers.jsx";
import AttackRunMarkers from "./AttackRunMarkers.jsx";
import ControlPointMarkers from "./ControlPointMarkers.jsx";
import ObserverMarker from "./ObserverMarker.jsx";
import ArtilleryOverlay from "./ArtilleryOverlay.jsx";

function TacticalBounds({ targets, controlPoints, observerPosition, artillery }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return;
    const positions = [
      observerPosition,
      ...targets.map((item) => item.position),
      ...controlPoints.map((item) => item.position),
      ...artillery.map((item) => item.position),
    ].filter(Boolean);
    if (positions.length < 2) return;

    const bounds = new window.google.maps.LatLngBounds();
    positions.forEach((position) => bounds.extend(position));
    map.fitBounds(bounds, 55);
  }, [artillery, controlPoints, map, observerPosition, targets]);

  return null;
}

export default function AttackRunMap({
  attackStatus,
  brief,
  platform,
  targets = [],
  controlPoints = [],
  observerPosition = null,
  artillery = [],
  fullTacticalPicture = false,
}) {
  const [now, setNow] = useState(Date.now());
  const targetPosition = attackStatus?.attackTarget?.position || brief?.target?.position;

  useEffect(() => {
    if (!targetPosition) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(timer);
  }, [targetPosition]);

  if (!targetPosition) return null;

  const target = brief?.target || attackStatus.attackTarget;
  const visibleTargets = fullTacticalPicture && targets.length ? targets : target ? [target] : [];

  return (
    <div className="attackRunMap">
      <Map
        key={`${targetPosition.lat}-${targetPosition.lng}`}
        defaultCenter={targetPosition}
        defaultZoom={fullTacticalPicture ? 11 : 12}
        mapTypeId="satellite"
        disableDefaultUI
      >
        <TargetMarkers targets={visibleTargets} />
        {fullTacticalPicture && (
          <>
            <TacticalBounds
              targets={visibleTargets}
              controlPoints={controlPoints}
              observerPosition={observerPosition}
              artillery={artillery}
            />
            <ControlPointMarkers controlPoints={controlPoints} />
            <ArtilleryOverlay artillery={artillery} />
            <ObserverMarker observerPosition={observerPosition} />
          </>
        )}
        <AttackRunMarkers
          attackStatus={attackStatus}
          brief={brief}
          platform={platform}
          now={now}
        />
      </Map>
      <div className="attackRunMapStatus">
        <strong>{attackStatus.phase}</strong>
        <span>
          {attackStatus.weaponOutcome && !attackStatus.bdaAvailableAt
            ? `${attackStatus.weaponOutcome.toUpperCase()} / ${Math.round(attackStatus.missDistanceMetres || 0)}M`
            : attackStatus.weaponReleasedAt
              ? "EFFECTS ASSESSMENT PENDING"
              : "NO WEAPON RELEASE"}
        </span>
      </div>
    </div>
  );
}
