import { useEffect, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import TargetMarkers from "./TargetMarkers.jsx";
import AttackRunMarkers from "./AttackRunMarkers.jsx";

export default function AttackRunMap({ attackStatus, brief, platform }) {
  const [now, setNow] = useState(Date.now());
  const targetPosition = attackStatus?.attackTarget?.position || brief?.target?.position;

  useEffect(() => {
    if (!targetPosition) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(timer);
  }, [targetPosition]);

  if (!targetPosition) return null;

  const target = brief?.target || attackStatus.attackTarget;

  return (
    <div className="attackRunMap">
      <Map
        key={`${targetPosition.lat}-${targetPosition.lng}`}
        defaultCenter={targetPosition}
        defaultZoom={12}
        mapTypeId="satellite"
        disableDefaultUI
      >
        <TargetMarkers targets={target ? [target] : []} />
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
          {attackStatus.weaponOutcome
            ? `${attackStatus.weaponOutcome.toUpperCase()} / ${Math.round(attackStatus.missDistanceMetres || 0)}M`
            : "NO WEAPON RELEASE"}
        </span>
      </div>
    </div>
  );
}
