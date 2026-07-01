import { useCallback, useEffect, useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import * as mgrs from "mgrs";
import TargetMarkers from "../components/TargetMarkers.jsx";
import MapCentreTracker from "../components/MapCentreTracker.jsx";
import Crosshair from "../components/Crosshair.jsx";
import TargetData from "../components/TargetData.jsx";
import MapControls from "../components/MapControls.jsx";
import TrainingNotes from "../components/TrainingNotes.jsx";
import TargetRegister from "../components/TargetRegister.jsx";
import IsrFeed from "../components/IsrFeed.jsx";
import ObserverPanel from "../components/ObserverPanel.jsx";
import ObserverMarker from "../components/ObserverMarker.jsx";
import ObserverLine from "../components/ObserverLine.jsx";
import MapContextMenu from "../components/MapContextMenu.jsx";
import AirPlatformMarker from "../components/AirPlatformMarker.jsx";
import AirPlatformLocator from "../components/AirPlatformLocator.jsx";
import ControlPointMarkers from "../components/ControlPointMarkers.jsx";
import ControlPointLocator from "../components/ControlPointLocator.jsx";

const savedTargets = "vintlander.targets";
const savedObserverPosition = "vintlander.observerPosition";
const savedControlPoints = "vintlander.controlPoints";

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

function loadSavedTargets() {
  try {
    const saved = window.localStorage.getItem(savedTargets);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadSavedObserverPosition() {
  try {
    const saved = window.localStorage.getItem(savedObserverPosition);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function loadSavedControlPoints() {
  try {
    const saved = window.localStorage.getItem(savedControlPoints);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function MapTrainer({
  platforms,
  setPlatforms,
  onNavigate = () => {},
  serialMode = false,
}) {
  const [mgrsInput, setMgrsInput] = useState("");
  const [position, setPosition] = useState({ lat: 51.5072, lng: -0.1276 });
  const [mapType, setMapType] = useState("satellite");
  const [zoom, setZoom] = useState(13);
  const [mapResetKey, setMapResetKey] = useState(0);
  const [targets, setTargets] = useState(loadSavedTargets);
  const [observerPosition, setObserverPosition] = useState(loadSavedObserverPosition);
  const [controlPoints, setControlPoints] = useState(loadSavedControlPoints);
  const [controlPointType, setControlPointType] = useState("ip");
  const [controlPointName, setControlPointName] = useState("");
  const [controlPointGrid, setControlPointGrid] = useState("");
  const [showObserverLine, setShowObserverLine] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [airPlatformPosition, setAirPlatformPosition] = useState(null);
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);
  const [showControlPointLocators, setShowControlPointLocators] =
    useState(false);
  const [missionAnchor, setMissionAnchor] = useState(position);
  const [airPictureTick, setAirPictureTick] = useState(0);

  const visibleAirPlatforms = useMemo(() => {
    if (!showAllPlatforms) return [];

    return platforms.map((platform, index) =>
      getPlatformTrack(platform, missionAnchor, airPictureTick + index * 1400)
    );
  }, [airPictureTick, missionAnchor, platforms, showAllPlatforms]);

  useEffect(() => {
    window.localStorage.setItem(savedTargets, JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    if (observerPosition) {
      window.localStorage.setItem(
        savedObserverPosition,
        JSON.stringify(observerPosition)
      );
      return;
    }

    window.localStorage.removeItem(savedObserverPosition);
  }, [observerPosition]);

  useEffect(() => {
    window.localStorage.setItem(savedControlPoints, JSON.stringify(controlPoints));
  }, [controlPoints]);

  useEffect(() => {
    if (!showAllPlatforms) return undefined;

    const timer = setInterval(() => {
      setAirPictureTick((currentTick) => currentTick + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showAllPlatforms]);

  function plotMgrs() {
    try {
      const [lng, lat] = mgrs.toPoint(mgrsInput.trim());
      const plottedPosition = { lat, lng };
      setPosition(plottedPosition);
      setMissionAnchor(plottedPosition);
      setMapResetKey((current) => current + 1);
    } catch {
      alert("Invalid MGRS grid");
    }
  }

  const updateActiveAirPlatform = useCallback((platform) => {
    setAirPlatformPosition(platform);

    if (platform?.anchor) {
      setMissionAnchor(platform.anchor);
    }
  }, []);

  function removePlatform(platformId) {
    setPlatforms((currentPlatforms) =>
      currentPlatforms.filter((platform) => platform.id !== platformId)
    );
  }

  function clearMission() {
    const confirmed = window.confirm(
      "Clear checked-in aircraft and saved targets for this mission?"
    );

    if (!confirmed) return;

    setPlatforms([]);
    setTargets([]);
    setObserverPosition(null);
    setControlPoints([]);
  }

  function buildControlPoint(pointPosition) {
    const nextNumber =
      controlPoints.filter((point) => point.type === controlPointType).length + 1;

    return {
      id: `${controlPointType.toUpperCase()}-${Date.now()}`,
      type: controlPointType,
      name:
        controlPointName.trim() ||
        `${controlPointType.toUpperCase()} ${nextNumber}`,
      position: pointPosition,
      mgrs: mgrs.forward([pointPosition.lng, pointPosition.lat]),
      createdAt: new Date().toLocaleTimeString(),
    };
  }

  function saveControlPointAtPosition(pointPosition) {
    setControlPoints((current) => [...current, buildControlPoint(pointPosition)]);
    setControlPointName("");
  }

  function saveControlPoint() {
    saveControlPointAtPosition(position);
  }

  function saveControlPointAtGrid() {
    try {
      const [lng, lat] = mgrs.toPoint(controlPointGrid.trim());
      saveControlPointAtPosition({ lat, lng });
      setControlPointGrid("");
    } catch {
      alert("Invalid IP/BP MGRS grid.");
    }
  }

  function deleteControlPoint(pointId) {
    setControlPoints((current) =>
      current.filter((point) => point.id !== pointId)
    );
  }

  return (
    <main className="mapPage">
      <section className="mapControls">
        <div className="pageBackRow compactBackRow">
          {serialMode ? (
            <SerialWorkflowNav onNavigate={onNavigate} />
          ) : (
            <button onClick={() => onNavigate("home")}>Home</button>
          )}
        </div>

        <h1>Mission Panel</h1>

        <button className="clearMission" onClick={clearMission}>
          Clear Mission
        </button>

        <MapControls
          mgrsInput={mgrsInput}
          setMgrsInput={setMgrsInput}
          plotMgrs={plotMgrs}
          mapType={mapType}
          setMapType={setMapType}
          zoom={zoom}
          setZoom={setZoom}
          mapResetKey={mapResetKey}
          setMapResetKey={setMapResetKey}
        />

        <TargetData position={position} zoom={zoom} mapType={mapType} />

        <div className="platformMonitor compactMonitor">
          <h2>AIR PICTURE / PLATFORMS</h2>

          <button
            className={`airPictureToggle ${showAllPlatforms ? "activeMode" : ""}`}
            onClick={() => setShowAllPlatforms((current) => !current)}
          >
            {showAllPlatforms ? "Hide Flying Platforms" : "Show Flying Platforms"}
          </button>

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

        <ObserverPanel
          observerPosition={observerPosition}
          setObserverPosition={setObserverPosition}
          position={position}
          setPosition={setPosition}
          setMapResetKey={setMapResetKey}
          showObserverLine={showObserverLine}
          setShowObserverLine={setShowObserverLine}
        />

        <div className="controlPointPanel">
          <h2>IP / BP MARKERS</h2>
          <div className="grid compactGrid">
            <label>
              Type
              <select
                value={controlPointType}
                onChange={(event) => setControlPointType(event.target.value)}
              >
                <option value="ip">IP</option>
                <option value="bp">BP</option>
              </select>
            </label>

            <label>
              Name
              <input
                value={controlPointName}
                onChange={(event) => setControlPointName(event.target.value)}
                placeholder="Auto if blank"
              />
            </label>
          </div>

          <button onClick={saveControlPoint}>Save IP/BP At Crosshair</button>

          <label className="field">
            Centre MGRS
            <input
              value={controlPointGrid}
              onChange={(event) =>
                setControlPointGrid(event.target.value.toUpperCase())
              }
              placeholder="Example: 30U XB 12345 67890"
            />
          </label>

          <button onClick={saveControlPointAtGrid}>Save IP/BP At Grid</button>

          <button
            className={`airPictureToggle ${
              showControlPointLocators ? "activeMode" : ""
            }`}
            onClick={() =>
              setShowControlPointLocators((currentValue) => !currentValue)
            }
          >
            {showControlPointLocators
              ? "Hide Off-Map IP/BP"
              : "Show Off-Map IP/BP"}
          </button>

          {controlPoints.length === 0 ? (
            <p className="emptyText">No IP/BP markers saved yet.</p>
          ) : (
            controlPoints.map((point) => (
              <div key={point.id} className="dataRow">
                <span>{point.name}</span>
                <strong>{point.type.toUpperCase()}</strong>
                <button
                  className="removeControlPoint"
                  onClick={() => deleteControlPoint(point.id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <TargetRegister
          targets={targets}
          setTargets={setTargets}
          position={position}
          setPosition={setPosition}
          setMapResetKey={setMapResetKey}
        />

        <TrainingNotes />
      </section>

      <section
        className="mapBox"
        onContextMenu={(event) => {
          event.preventDefault();

          setContextMenu({
            x: event.clientX,
            y: event.clientY,
          });
        }}
      >
        <Map
          key={mapResetKey}
          defaultCenter={position}
          zoom={zoom}
          mapTypeId={mapType}
          gestureHandling="auto"
          disableDefaultUI={true}
        >
          <MapCentreTracker setPosition={setPosition} />
          <TargetMarkers targets={targets} />
          <ControlPointMarkers controlPoints={controlPoints} />
          <ObserverMarker observerPosition={observerPosition} />
          <ObserverLine
            observerPosition={observerPosition}
            position={position}
            showLine={showObserverLine}
          />
          {showAllPlatforms ? (
            visibleAirPlatforms.map((platform) => (
              <AirPlatformMarker key={platform.id} platform={platform} />
            ))
          ) : (
            <AirPlatformMarker platform={airPlatformPosition} />
          )}
        </Map>

        <Crosshair />
        {showAllPlatforms ? (
          visibleAirPlatforms.map((platform, index) => (
            <AirPlatformLocator
              key={`${platform.id}-locator`}
              platform={platform}
              mapCenter={position}
              zoom={zoom}
              alwaysVisible={true}
              index={index}
            />
          ))
        ) : (
          <AirPlatformLocator
            platform={airPlatformPosition}
            mapCenter={position}
            zoom={zoom}
          />
        )}
        {showControlPointLocators &&
          controlPoints.map((point, index) => (
            <ControlPointLocator
              key={`${point.id}-locator`}
              point={point}
              mapCenter={position}
              zoom={zoom}
              index={index}
            />
          ))}
        <MapContextMenu
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          position={position}
          setObserverPosition={setObserverPosition}
        />
        <IsrFeed
          position={position}
          targets={targets}
          platforms={platforms}
          onSensorPositionChange={updateActiveAirPlatform}
        />
      </section>
    </main>
  );
}

function getPlatformTrack(platform, anchor, tick) {
  const altitudeProfile = getAltitudeProfile(platform.positionAltitude);
  const platformProfile = getPlatformProfile(platform.aircraft);
  const orbitCenter = getStandoffOrbitCenter(anchor, altitudeProfile, platformProfile);
  const position = getOrbitPosition(orbitCenter, tick, altitudeProfile, platformProfile);

  return {
    id: platform.id,
    position,
    callsign: platform.callsign,
    aircraft: platform.aircraft,
    altitude: formatPlatformAltitude(platform.positionAltitude),
    mode: platformProfile.label,
  };
}

function getOrbitPosition(center, tick, altitudeProfile, platformProfile) {
  const eastAxis = altitudeProfile.orbitEast * platformProfile.orbitScale;
  const northAxis = altitudeProfile.orbitNorth * platformProfile.orbitScale;
  const phase = getPathPhase(tick, eastAxis, northAxis, platformProfile);

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

function getStandoffOrbitCenter(anchor, altitudeProfile, platformProfile) {
  const standoffMetres =
    platformProfile.standoffMetres * altitudeProfile.standoffMultiplier;

  return offsetPosition(
    anchor,
    ...rotateOffset(standoffMetres, standoffMetres * 0.35, platformProfile.rotation)
  );
}

function getPathPhase(tick, eastAxis, northAxis, platformProfile) {
  const speedMps = platformProfile.speedMps || 50;
  const pathLength = getPathLengthMetres(eastAxis, northAxis, platformProfile);

  return ((tick * speedMps) / Math.max(pathLength, 1)) * Math.PI * 2;
}

function getPathLengthMetres(eastAxis, northAxis, platformProfile) {
  if (platformProfile.path === "fastRacetrack") {
    return eastAxis * 4 + Math.PI * northAxis * 2;
  }

  if (platformProfile.path === "heliPatrol") {
    return getEllipseCircumference(eastAxis * 0.55, northAxis * 0.42) * 1.25;
  }

  return getEllipseCircumference(eastAxis, northAxis);
}

function getEllipseCircumference(a, b) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
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

  const formattedAltitude = altitude[0].toUpperCase().replace(/\s+/g, " ");
  const angelsMatch = formattedAltitude.match(/ANGELS\s*(\d+)/);

  if (angelsMatch) {
    return `${Number(angelsMatch[1]) * 1000} FT`;
  }

  return formattedAltitude;
}

function getAltitudeProfile(positionAltitude = "") {
  const altitude = formatPlatformAltitude(positionAltitude);
  const angelsMatch = altitude.match(/ANGELS\s*(\d+)/);
  const feetMatch = altitude.match(/(\d+)\s*FT/);
  const altitudeFeet = angelsMatch
    ? Number(angelsMatch[1]) * 1000
    : feetMatch
      ? Number(feetMatch[1])
      : 0;

  if (altitude.includes("LOW LEVEL") || (altitudeFeet > 0 && altitudeFeet <= 700)) {
    return { orbitEast: 420, orbitNorth: 260, standoffMultiplier: 0.75 };
  }

  if (altitudeFeet > 22000) {
    return { orbitEast: 2400, orbitNorth: 1500, standoffMultiplier: 1.45 };
  }

  if (altitudeFeet >= 10000) {
    return { orbitEast: 1150, orbitNorth: 720, standoffMultiplier: 1.2 };
  }

  if (altitudeFeet > 0) {
    return { orbitEast: 700, orbitNorth: 430, standoffMultiplier: 1 };
  }

  return { orbitEast: 850, orbitNorth: 520, standoffMultiplier: 1 };
}

function getPlatformProfile(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (normalisedAircraft.includes("MQ-9") || normalisedAircraft.includes("REAPER")) {
    return {
      label: "ISR ORBIT",
      path: "uavOrbit",
      orbitScale: 4.8,
      speedMps: 46,
      rotation: 32,
      drift: 520,
      standoffMetres: 5200,
    };
  }

  if (normalisedAircraft.includes("APACHE")) {
    return {
      label: "HELI PATROL",
      path: "heliPatrol",
      orbitScale: 1.25,
      speedMps: 35,
      rotation: 18,
      drift: 90,
      standoffMetres: 1200,
    };
  }

  if (normalisedAircraft.includes("F-35")) {
    return {
      label: "HIGH RACETRACK",
      path: "fastRacetrack",
      orbitScale: 5.6,
      speedMps: 185,
      rotation: 42,
      drift: 0,
      standoffMetres: 12500,
    };
  }

  if (normalisedAircraft.includes("TYPHOON")) {
    return {
      label: "FAST RACETRACK",
      path: "fastRacetrack",
      orbitScale: 4.8,
      speedMps: 205,
      rotation: 38,
      drift: 0,
      standoffMetres: 9500,
    };
  }

  return {
    label: "RACETRACK",
    path: "fastRacetrack",
    orbitScale: 3.6,
    speedMps: 180,
    rotation: 36,
    drift: 0,
    standoffMetres: 8000,
  };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
