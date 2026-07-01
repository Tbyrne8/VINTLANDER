import { useEffect, useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import * as mgrs from "mgrs";

export default function IsrFeed({
  position,
  targets,
  platforms,
  onSensorPositionChange,
}) {
  const [open, setOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [unlockedPlatform, setUnlockedPlatform] = useState(null);
  const [sensorMode, setSensorMode] = useState("EO");
  const [zoomLevel, setZoomLevel] = useState(2);
  const [activeTargetId, setActiveTargetId] = useState(null);
  const [feedTick, setFeedTick] = useState(0);
  const [orbitAnchor, setOrbitAnchor] = useState(position);

  const currentMgrs = mgrs
    .forward([orbitAnchor.lng, orbitAnchor.lat])
    .replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/, "$1 $2 $3 $4");

  const altitudeProfile = useMemo(
    () => getAltitudeProfile(unlockedPlatform?.positionAltitude),
    [unlockedPlatform?.positionAltitude]
  );
  const platformProfile = useMemo(
    () => getPlatformProfile(unlockedPlatform?.aircraft),
    [unlockedPlatform?.aircraft]
  );
  const activeTarget = targets.find((target) => target.id === activeTargetId);
  const aircraftPosition = useMemo(
    () =>
      getOrbitPosition(orbitAnchor, feedTick, altitudeProfile, platformProfile),
    [altitudeProfile, feedTick, orbitAnchor, platformProfile]
  );
  const feedCenter = useMemo(
    () => (activeTarget ? activeTarget.position : aircraftPosition),
    [activeTarget, aircraftPosition]
  );
  const feedCenterMgrs = mgrs
    .forward([feedCenter.lng, feedCenter.lat])
    .replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/, "$1 $2 $3 $4");

  const targetRange = activeTarget
    ? formatDistance(getDistanceMetres(aircraftPosition, activeTarget.position))
    : "NO TRACK";
  const activeTargetPosition = activeTarget
    ? getFeedPosition(feedCenter, activeTarget.position, zoomLevel, altitudeProfile)
    : null;
  const feedMapType = sensorMode === "MAP" ? "hybrid" : "satellite";
  const feedMapZoom = activeTarget
    ? Math.min(20, altitudeProfile.trackZoomBase + zoomLevel)
    : Math.min(18, altitudeProfile.areaZoomBase + zoomLevel);
  const platformAltitude = formatPlatformAltitude(
    unlockedPlatform?.positionAltitude
  );
  const feedMode = activeTarget ? "TARGET TRACK" : "AREA ORBIT";

  useEffect(() => {
    if (!onSensorPositionChange) return;

    if (!unlockedPlatform) {
      onSensorPositionChange(null);
      return;
    }

    onSensorPositionChange({
      position: aircraftPosition,
      anchor: orbitAnchor,
      callsign: unlockedPlatform.callsign,
      aircraft: unlockedPlatform.aircraft,
      altitude: platformAltitude,
      mode: feedMode,
    });
  }, [
    feedTick,
    feedMode,
    onSensorPositionChange,
    orbitAnchor,
    platformAltitude,
    unlockedPlatform?.aircraft,
    unlockedPlatform?.callsign,
    unlockedPlatform?.id,
  ]);

  useEffect(() => {
    if (
      unlockedPlatform &&
      !platforms.some((platform) => platform.id === unlockedPlatform.id)
    ) {
      setUnlockedPlatform(null);
      setAccessCode("");
    }
  }, [platforms, unlockedPlatform]);

  useEffect(() => {
    if (activeTargetId && !targets.some((target) => target.id === activeTargetId)) {
      setActiveTargetId(null);
    }
  }, [activeTargetId, targets]);

  useEffect(() => {
    if (!unlockedPlatform) return undefined;

    const timer = setInterval(() => {
      setFeedTick((currentTick) => currentTick + 1);
    }, 80);

    return () => clearInterval(timer);
  }, [unlockedPlatform]);

  function unlockFeed() {
    const enteredCode = accessCode.trim();
    const platform = platforms.find(
      (item) => item.downlinkCode === enteredCode
    );

    if (platform) {
      setOrbitAnchor(position);
      setUnlockedPlatform(platform);
      return;
    }

    alert("No checked-in aircraft matches that downlink code.");
  }

  function changeZoom(direction) {
    setZoomLevel((currentZoom) =>
      Math.min(4, Math.max(1, currentZoom + direction))
    );
  }

  return (
    <div className={`vdlWindow ${open ? "open" : "closed"}`}>
      <button className="vdlHeader" onClick={() => setOpen(!open)}>
        <span>ISR FEED</span>
        <strong>{open ? "MINIMISE" : "OPEN"}</strong>
      </button>

      {open && (
        <div className="vdlBody">
          {!unlockedPlatform ? (
            <div className="vdlLocked">
              <h3>ACCESS REQUIRED</h3>
              <p>Enter the downlink code from a checked-in aircraft.</p>

              <input
                value={accessCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  if (value.length <= 4) {
                    setAccessCode(value);
                  }
                }}
                placeholder="4-digit downlink code"
              />

              <button onClick={unlockFeed}>Unlock ISR Feed</button>

              {platforms.length === 0 && (
                <p className="emptyText">No aircraft are checked in yet.</p>
              )}
            </div>
          ) : (
            <>
              <div className="vdlControls">
                {["EO", "IR", "MAP"].map((mode) => (
                  <button
                    key={mode}
                    className={sensorMode === mode ? "activeMode" : ""}
                    onClick={() => setSensorMode(mode)}
                  >
                    {mode}
                  </button>
                ))}

                <button onClick={() => changeZoom(-1)}>-</button>
                <strong>{zoomLevel}X</strong>
                <button onClick={() => changeZoom(1)}>+</button>
              </div>

              <div className={`vdlFeed ${sensorMode.toLowerCase()}Mode`}>
                <div className="vdlLiveMap">
                  <Map
                    key={`${feedMapZoom}-${feedMapType}`}
                    center={feedCenter}
                    zoom={feedMapZoom}
                    mapTypeId={feedMapType}
                    disableDefaultUI={true}
                    gestureHandling="none"
                    keyboardShortcuts={false}
                  />
                </div>
                <div className="vdlScene mapImagery">
                  <div className="vdlTerrain terrainOne"></div>
                  <div className="vdlTerrain terrainTwo"></div>
                  <div className="vdlRoad mainRoad"></div>
                  <div className="vdlRoad sideRoad"></div>
                  <div className="vdlCompound">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="vdlHeatSource heatOne"></div>
                  <div className="vdlHeatSource heatTwo"></div>
                  {activeTarget && activeTargetPosition && (
                    <div
                      className={`vdlTargetBox ${activeTarget.type}`}
                      style={{
                        left: `${activeTargetPosition.left}%`,
                        top: `${activeTargetPosition.top}%`,
                      }}
                    >
                      <span>{activeTarget.id}</span>
                    </div>
                  )}
                </div>
                <div className="vdlReticle"></div>
                <div className="vdlScanline"></div>
                <div className="vdlModeTag">{sensorMode}</div>
                <div className="vdlAircraftOrbit">
                  {unlockedPlatform.callsign} / {feedMode}
                </div>
                {targets.map((target, index) => (
                  <button
                    key={target.id}
                    className={`vdlTrackBlip ${
                      activeTarget?.id === target.id ? "active" : ""
                    } ${target.type}`}
                    style={getFeedPositionStyle(
                      feedCenter,
                      target.position,
                      zoomLevel,
                      altitudeProfile
                    )}
                    onClick={() => setActiveTargetId(target.id)}
                    title={`${target.id} ${target.description}`}
                  >
                    {index + 1}
                  </button>
                ))}
                {!activeTarget && (
                  <div className="vdlNoTrack">NO TRACK SELECTED</div>
                )}
                <div className="vdlStatusStrip">
                  <span>{feedCenterMgrs}</span>
                  <span>{targetRange}</span>
                  <span>REC</span>
                </div>
              </div>

              <div className="vdlData">
                <div>
                  <span>AREA GRID</span>
                  <strong>{currentMgrs}</strong>
                </div>

                <div>
                  <span>SENSOR POINT</span>
                  <strong>{feedMode}</strong>
                </div>

                <div>
                  <span>FEED GRID</span>
                  <strong>{feedCenterMgrs}</strong>
                </div>

                <div>
                  <span>TRACK GRID</span>
                  <strong>
                    {activeTarget?.mgrs ? formatMgrs(activeTarget.mgrs) : "NONE"}
                  </strong>
                </div>

                <div>
                  <span>PLATFORM</span>
                  <strong>{unlockedPlatform.callsign}</strong>
                </div>

                <div>
                  <span>AIRCRAFT</span>
                  <strong>{unlockedPlatform.aircraft}</strong>
                </div>

                <div>
                  <span>PLATFORM ALT</span>
                  <strong>{platformAltitude}</strong>
                </div>

                <div>
                  <span>ALT BAND</span>
                  <strong>{altitudeProfile.label}</strong>
                </div>

                <div>
                  <span>ORBIT</span>
                  <strong>{platformProfile.label}</strong>
                </div>

                <div>
                  <span>CAPABILITY</span>
                  <strong>{unlockedPlatform.capabilities}</strong>
                </div>

                <div>
                  <span>SENSOR</span>
                  <strong>
                    {sensorMode} / {zoomLevel}X
                  </strong>
                </div>

                <div>
                  <span>RANGE</span>
                  <strong>{targetRange}</strong>
                </div>

                <div>
                  <span>TRACKS</span>
                  <strong>{targets.length}</strong>
                </div>
              </div>

              <div className="vdlTrackList">
                <h3>TRACKS</h3>

                {targets.length === 0 && (
                  <p className="emptyText">No saved targets in the feed.</p>
                )}

                {targets.map((target) => (
                  <button
                    key={target.id}
                    className={activeTarget?.id === target.id ? "activeTrack" : ""}
                    onClick={() => setActiveTargetId(target.id)}
                  >
                    <strong>{target.id}</strong>
                    <span>{target.description}</span>
                    <small>
                      {target.type.toUpperCase()} - {formatMgrs(target.mgrs)}
                    </small>
                  </button>
                ))}

                {activeTarget && (
                  <button
                    className="breakTrack"
                    onClick={() => setActiveTargetId(null)}
                  >
                    Return To Area Orbit
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatMgrs(value) {
  return value.replace(
    /^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/,
    "$1 $2 $3 $4"
  );
}

function getDistanceMetres(from, to) {
  const earthRadius = 6371000;
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} KM`;
  }

  return `${distance.toFixed(0)} M`;
}

function getOrbitPosition(center, tick, altitudeProfile, platformProfile) {
  const phase = tick * platformProfile.orbitSpeed;
  const eastAxis = altitudeProfile.orbitEast * platformProfile.orbitScale;
  const northAxis = altitudeProfile.orbitNorth * platformProfile.orbitScale;

  if (platformProfile.path === "uavOrbit") {
    const unrotatedEast =
      Math.cos(phase) * eastAxis +
      Math.sin(phase * 0.7) * platformProfile.drift;
    const unrotatedNorth =
      Math.sin(phase) * northAxis +
      Math.cos(phase * 0.45) * platformProfile.drift;

    return offsetPosition(
      center,
      ...rotateOffset(unrotatedEast, unrotatedNorth, platformProfile.rotation)
    );
  }

  if (platformProfile.path === "heliPatrol") {
    const patrolPhase = phase * 1.45;
    const unrotatedEast =
      Math.sin(patrolPhase) * eastAxis * 0.55 +
      Math.sin(patrolPhase * 2.5) * platformProfile.drift;
    const unrotatedNorth =
      Math.sin(patrolPhase) * Math.cos(patrolPhase) * northAxis * 0.42 +
      Math.cos(patrolPhase * 1.7) * platformProfile.drift * 0.55;

    return offsetPosition(
      center,
      ...rotateOffset(unrotatedEast, unrotatedNorth, platformProfile.rotation)
    );
  }

  if (platformProfile.path === "fastRacetrack") {
    const progress = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
    const longLeg = eastAxis;
    const turnRadius = northAxis;
    let unrotatedEast;
    let unrotatedNorth;

    if (progress < 0.35) {
      const legProgress = progress / 0.35;
      unrotatedEast = -longLeg + legProgress * longLeg * 2;
      unrotatedNorth = turnRadius;
    } else if (progress < 0.5) {
      const turnProgress = (progress - 0.35) / 0.15;
      const angle = turnProgress * Math.PI;
      unrotatedEast = longLeg + Math.sin(angle) * turnRadius;
      unrotatedNorth = Math.cos(angle) * turnRadius;
    } else if (progress < 0.85) {
      const legProgress = (progress - 0.5) / 0.35;
      unrotatedEast = longLeg - legProgress * longLeg * 2;
      unrotatedNorth = -turnRadius;
    } else {
      const turnProgress = (progress - 0.85) / 0.15;
      const angle = Math.PI + turnProgress * Math.PI;
      unrotatedEast = -longLeg + Math.sin(angle) * turnRadius;
      unrotatedNorth = Math.cos(angle) * turnRadius;
    }

    return offsetPosition(
      center,
      ...rotateOffset(unrotatedEast, unrotatedNorth, platformProfile.rotation)
    );
  }

  const unrotatedEast =
    Math.cos(phase) * eastAxis + Math.sin(phase * 3) * platformProfile.drift;
  const unrotatedNorth =
    Math.sin(phase) * northAxis + Math.cos(phase * 2) * platformProfile.drift;

  return offsetPosition(
    center,
    ...rotateOffset(unrotatedEast, unrotatedNorth, platformProfile.rotation)
  );
}

function rotateOffset(eastMetres, northMetres, rotationDegrees) {
  const rotation = toRadians(rotationDegrees);

  return [
    eastMetres * Math.cos(rotation) - northMetres * Math.sin(rotation),
    eastMetres * Math.sin(rotation) + northMetres * Math.cos(rotation),
  ];
}

function offsetPosition(center, eastMetres, northMetres) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos(toRadians(center.lat || 0));

  return {
    lat: center.lat + northMetres / metresPerDegreeLat,
    lng: center.lng + eastMetres / metresPerDegreeLng,
  };
}

function formatPlatformAltitude(positionAltitude = "") {
  const altitude = positionAltitude.match(/ANGELS\s*\d+|\d+\s*FT|LOW LEVEL/i);

  if (!altitude) {
    return "UNKNOWN";
  }

  return altitude[0].toUpperCase().replace(/\s+/g, " ");
}

function getAltitudeProfile(positionAltitude = "") {
  const altitude = formatPlatformAltitude(positionAltitude);
  const angelsMatch = altitude.match(/ANGELS\s*(\d+)/);
  const feetMatch = altitude.match(/(\d+)\s*FT/);

  if (altitude.includes("LOW LEVEL") || (feetMatch && Number(feetMatch[1]) <= 700)) {
    return {
      label: "LOW",
      areaZoomBase: 13,
      trackZoomBase: 16,
      orbitEast: 420,
      orbitNorth: 260,
      radiusMultiplier: 0.75,
    };
  }

  if (feetMatch) {
    return {
      label: "MEDIUM",
      areaZoomBase: 12,
      trackZoomBase: 15,
      orbitEast: 700,
      orbitNorth: 430,
      radiusMultiplier: 1,
    };
  }

  if (angelsMatch && Number(angelsMatch[1]) >= 18) {
    return {
      label: "VERY HIGH",
      areaZoomBase: 8,
      trackZoomBase: 13,
      orbitEast: 2400,
      orbitNorth: 1500,
      radiusMultiplier: 4.2,
    };
  }

  if (angelsMatch) {
    return {
      label: "HIGH",
      areaZoomBase: 11,
      trackZoomBase: 14,
      orbitEast: 1150,
      orbitNorth: 720,
      radiusMultiplier: 1.65,
    };
  }

  return {
    label: "STANDARD",
    areaZoomBase: 12,
    trackZoomBase: 15,
    orbitEast: 850,
    orbitNorth: 520,
    radiusMultiplier: 1.2,
  };
}

function getPlatformProfile(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (normalisedAircraft.includes("MQ-9") || normalisedAircraft.includes("REAPER")) {
    return {
      label: "ISR ORBIT",
      path: "uavOrbit",
      orbitScale: 4.8,
      orbitSpeed: 0.00055,
      rotation: 32,
      drift: 520,
    };
  }

  if (normalisedAircraft.includes("APACHE")) {
    return {
      label: "HELI PATROL",
      path: "heliPatrol",
      orbitScale: 1.25,
      orbitSpeed: 0.0065,
      rotation: 18,
      drift: 90,
    };
  }

  if (normalisedAircraft.includes("F-35")) {
    return {
      label: "HIGH RACETRACK",
      path: "fastRacetrack",
      orbitScale: 5.6,
      orbitSpeed: 0.0045,
      rotation: 42,
      drift: 0,
    };
  }

  if (normalisedAircraft.includes("TYPHOON")) {
    return {
      label: "FAST RACETRACK",
      path: "fastRacetrack",
      orbitScale: 4.8,
      orbitSpeed: 0.0055,
      rotation: 38,
      drift: 0,
    };
  }

  return {
    label: "RACETRACK",
    path: "fastRacetrack",
    orbitScale: 3.6,
    orbitSpeed: 0.005,
    rotation: 36,
    drift: 0,
  };
}

function getFeedPositionStyle(center, target, zoomLevel, altitudeProfile) {
  const point = getFeedPosition(center, target, zoomLevel, altitudeProfile);
  return {
    left: `${point.left}%`,
    top: `${point.top}%`,
  };
}

function getFeedPosition(center, target, zoomLevel, altitudeProfile) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos(toRadians((center.lat + target.lat) / 2));
  const northMetres = (target.lat - center.lat) * metresPerDegreeLat;
  const eastMetres = (target.lng - center.lng) * metresPerDegreeLng;
  const viewRadiusMetres = getViewRadiusMetres(zoomLevel, altitudeProfile);

  return {
    left: clamp(50 + (eastMetres / viewRadiusMetres) * 45, 7, 93),
    top: clamp(50 - (northMetres / viewRadiusMetres) * 45, 8, 92),
  };
}

function getViewRadiusMetres(zoomLevel, altitudeProfile) {
  const radiusByZoom = {
    1: 3600,
    2: 2100,
    3: 1100,
    4: 560,
  };

  return (radiusByZoom[zoomLevel] || radiusByZoom[2]) * altitudeProfile.radiusMultiplier;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
