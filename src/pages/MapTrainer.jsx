import { useCallback, useEffect, useMemo, useState } from "react";
import { Map } from "@vis.gl/react-google-maps";
import * as mgrs from "mgrs";
import { formatMgrs, parseMgrs } from "../utils/mgrs.js";
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
import PendingRouteLine from "../components/PendingRouteLine.jsx";

const savedTargets = "vintlander.targets";
const savedObserverPosition = "vintlander.observerPosition";
const savedControlPoints = "vintlander.controlPoints";
const savedPendingCheckIn = "vintlander.pendingCheckIn";
const savedMapCenter = "vintlander.mapCenter";
const standaloneStorageKeys = {
  targets: "vintlander.standalone.targets",
  observerPosition: "vintlander.standalone.observerPosition",
  controlPoints: "vintlander.standalone.controlPoints",
  mapCenter: "vintlander.standalone.mapCenter",
};
const defaultMapPosition = { lat: 51.38466954999258, lng: -2.3747654912984433 };
const heightBlockOptions = Array.from({ length: 30 }, (_, index) => {
  const feet = (index + 1) * 1000;
  return `${feet} FT`;
});

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

function getMapStorageKeys(serialMode) {
  return serialMode
    ? {
        targets: savedTargets,
        observerPosition: savedObserverPosition,
        controlPoints: savedControlPoints,
        mapCenter: savedMapCenter,
      }
    : standaloneStorageKeys;
}

function loadSavedTargets(storageKeys) {
  try {
    const saved = window.localStorage.getItem(storageKeys.targets);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadSavedObserverPosition(storageKeys) {
  try {
    const saved = window.localStorage.getItem(storageKeys.observerPosition);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function loadSavedMapCenter(storageKeys) {
  try {
    const saved = window.localStorage.getItem(storageKeys.mapCenter);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function loadSavedControlPoints(storageKeys) {
  try {
    const saved = window.localStorage.getItem(storageKeys.controlPoints);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadPendingCheckIn() {
  try {
    const saved = window.localStorage.getItem(savedPendingCheckIn);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function MapTrainer({
  platforms,
  setPlatforms,
  onNavigate = () => {},
  serialMode = false,
}) {
  const storageKeys = useMemo(() => getMapStorageKeys(serialMode), [serialMode]);
  const [mgrsInput, setMgrsInput] = useState("");
  const [position, setPosition] = useState(
    loadSavedMapCenter(storageKeys) ||
      loadSavedObserverPosition(storageKeys) ||
      defaultMapPosition
  );
  const [mapType, setMapType] = useState("satellite");
  const [zoom, setZoom] = useState(13);
  const [mapResetKey, setMapResetKey] = useState(0);
  const [targets, setTargets] = useState(() => loadSavedTargets(storageKeys));
  const [observerPosition, setObserverPosition] = useState(() =>
    loadSavedObserverPosition(storageKeys)
  );
  const [controlPoints, setControlPoints] = useState(() =>
    loadSavedControlPoints(storageKeys)
  );
  const [controlPointType, setControlPointType] = useState("ip");
  const [controlPointName, setControlPointName] = useState("");
  const [controlPointGrid, setControlPointGrid] = useState("");
  const [showObserverLine, setShowObserverLine] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [airPlatformPosition, setAirPlatformPosition] = useState(null);
  const [showAllPlatforms, setShowAllPlatforms] = useState(true);
  const [showControlPointLocators, setShowControlPointLocators] =
    useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState(() =>
    serialMode ? loadPendingCheckIn() : null
  );
  const [missionAnchor, setMissionAnchor] = useState(position);
  const [airPictureTick, setAirPictureTick] = useState(0);

  const livePlatformTracks = useMemo(
    () =>
      platforms.map((platform, index) =>
      getLivePlatformTrack(platform, missionAnchor, airPictureTick + index * 1400)
      ),
    [airPictureTick, missionAnchor, platforms]
  );

  const visibleAirPlatforms = useMemo(() => {
    if (!showAllPlatforms) return [];

    return livePlatformTracks;
  }, [livePlatformTracks, showAllPlatforms]);

  const routedPendingPlatform = useMemo(() => {
    if (!pendingCheckIn?.routePosition) return null;

    return getPendingPlatformTrack(pendingCheckIn, airPictureTick);
  }, [airPictureTick, pendingCheckIn]);

  const pendingRouteLine = useMemo(() => {
    if (!pendingCheckIn?.routePosition || !routedPendingPlatform) return null;

    if (routedPendingPlatform.routePhase !== "inbound") return null;

    return {
      from: routedPendingPlatform.position,
      to: pendingCheckIn.routePosition,
    };
  }, [pendingCheckIn, routedPendingPlatform]);
  const platformRouteLines = useMemo(
    () =>
      livePlatformTracks
        .filter((platform) => platform.routePhase === "inbound" && platform.routePosition)
        .map((platform) => ({
          id: platform.id,
          from: platform.position,
          to: platform.routePosition,
        })),
    [livePlatformTracks]
  );

  useEffect(() => {
    window.localStorage.setItem(storageKeys.targets, JSON.stringify(targets));
  }, [storageKeys.targets, targets]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.mapCenter, JSON.stringify(position));
  }, [position, storageKeys.mapCenter]);

  useEffect(() => {
    if (observerPosition) {
      window.localStorage.setItem(
        storageKeys.observerPosition,
        JSON.stringify(observerPosition)
      );
      return;
    }

    window.localStorage.removeItem(storageKeys.observerPosition);
  }, [observerPosition, storageKeys.observerPosition]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKeys.controlPoints,
      JSON.stringify(controlPoints)
    );
  }, [controlPoints, storageKeys.controlPoints]);

  useEffect(() => {
    if (
      !serialMode ||
      !pendingCheckIn?.routePosition ||
      pendingCheckIn.routeStartedAt
    ) {
      return;
    }

    const updatedTasking = {
      ...pendingCheckIn,
      routeStartedAt: Date.now(),
    };

    window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(updatedTasking));
    setPendingCheckIn(updatedTasking);
  }, [pendingCheckIn, serialMode]);

  useEffect(() => {
    if (
      !serialMode ||
      !pendingCheckIn?.routePosition ||
      !pendingCheckIn.routeStartedAt ||
      pendingCheckIn.routeEstablishedAt
    ) {
      return;
    }

    const transitDuration = getRouteTransitDurationMs(pendingCheckIn);

    if (Date.now() - pendingCheckIn.routeStartedAt < transitDuration) return;

    const routeLabel =
      pendingCheckIn.routedControlPoint?.label ||
      formatControlPointLabel(pendingCheckIn.routedControlPoint || {});
    const updatedTasking = {
      ...pendingCheckIn,
      route: `Aircraft established in ${routeLabel}.`,
      routeStatus: `ESTABLISHED IN ${routeLabel}`,
      routeEstablishedAt: Date.now(),
    };

    window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(updatedTasking));
    setPendingCheckIn(updatedTasking);
  }, [airPictureTick, pendingCheckIn, serialMode]);

  useEffect(() => {
    const needsRouteStart = platforms.some(
      (platform) =>
        platform.routePosition &&
        !platform.routeStartedAt &&
        !platform.routeEstablishedAt &&
        /ROUTING TO/i.test(platform.routeStatus || platform.route || "")
    );

    if (!needsRouteStart) return;

    setPlatforms((currentPlatforms) =>
      currentPlatforms.map((platform) => {
        if (
          !platform.routePosition ||
          platform.routeStartedAt ||
          platform.routeEstablishedAt ||
          !/ROUTING TO/i.test(platform.routeStatus || platform.route || "")
        ) {
          return platform;
        }

        return {
          ...platform,
          routeStartedAt: Date.now(),
          inboundStartPosition:
            platform.inboundStartPosition ||
            getInboundStartPosition(platform.routePosition),
        };
      })
    );
  }, [platforms, setPlatforms]);

  useEffect(() => {
    const inboundPlatforms = platforms.filter(
      (platform) =>
        platform.routePosition &&
        platform.routeStartedAt &&
        !platform.routeEstablishedAt
    );

    if (inboundPlatforms.length === 0) return;

    const now = Date.now();
    const needsUpdate = inboundPlatforms.some(
      (platform) => now - platform.routeStartedAt >= getRouteTransitDurationMs(platform)
    );

    if (!needsUpdate) return;

    setPlatforms((currentPlatforms) =>
      currentPlatforms.map((platform) => {
        if (
          !platform.routePosition ||
          !platform.routeStartedAt ||
          platform.routeEstablishedAt ||
          now - platform.routeStartedAt < getRouteTransitDurationMs(platform)
        ) {
          return platform;
        }

        const routeLabel =
          platform.routedControlPoint?.label ||
          formatControlPointLabel(platform.routedControlPoint || {});

        return {
          ...platform,
          route: `Aircraft established in ${routeLabel}.`,
          routeStatus: `ESTABLISHED IN ${routeLabel}`,
          routeEstablishedAt: now,
        };
      })
    );
  }, [airPictureTick, platforms, setPlatforms]);

  useEffect(() => {
    if (!showAllPlatforms && !pendingCheckIn?.routePosition) return undefined;

    const timer = setInterval(() => {
      setAirPictureTick((currentTick) => currentTick + 1);
    }, 500);

    return () => clearInterval(timer);
  }, [pendingCheckIn?.routePosition, showAllPlatforms]);

  function plotMgrs() {
    try {
      const plottedPosition = parseMgrs(mgrsInput);
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
      saveControlPointAtPosition(parseMgrs(controlPointGrid));
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

  function routePendingAircraft(point) {
    if (!pendingCheckIn) return;

    const routeLabel = formatControlPointLabel(point);
    const routeType = getControlPointRoleForAircraft(
      pendingCheckIn.aircraftLabel || pendingCheckIn.aircraftId
    );

    if (point.type !== routeType) {
      alert(
        `${pendingCheckIn.aircraftLabel || "This aircraft"} should be routed to a ${routeType.toUpperCase()}.`
      );
      return;
    }

    const updatedTasking = {
      ...pendingCheckIn,
      route: `Aircraft cleared to ${routeLabel}. Await established call.`,
      routeStatus: `ROUTING TO ${routeLabel}`,
      clearanceRequested: false,
      routeEstablishedAt: null,
      routedControlPoint: {
        id: point.id,
        type: point.type,
        name: point.name,
        label: routeLabel,
        position: point.position,
        mgrs: point.mgrs,
      },
      routePosition: point.position,
      routeAltitude: pendingCheckIn.routeAltitude || getDefaultRouteAltitude(
        pendingCheckIn.aircraftLabel || pendingCheckIn.aircraftId
      ),
      routeStartedAt: Date.now(),
      inboundStartPosition: getInboundStartPosition(point.position),
      routedAt: new Date().toLocaleTimeString(),
    };

    window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(updatedTasking));
    setPendingCheckIn(updatedTasking);
    setMissionAnchor(point.position);
    setPosition(point.position);
    setMapResetKey((current) => current + 1);
  }

  function updatePendingRouteAltitude(altitude) {
    if (!pendingCheckIn) return;

    const updatedTasking = {
      ...pendingCheckIn,
      routeAltitude: altitude,
    };

    window.localStorage.setItem(savedPendingCheckIn, JSON.stringify(updatedTasking));
    setPendingCheckIn(updatedTasking);
  }

  function updatePlatformHeight(platformId, altitude) {
    setPlatforms((currentPlatforms) =>
      currentPlatforms.map((platform) =>
        platform.id === platformId
          ? {
              ...platform,
              positionAltitude: replaceAltitude(platform.positionAltitude, altitude),
            }
          : platform
      )
    );
  }

  function routeCheckedInPlatform(platformId, pointId) {
    const point = controlPoints.find((controlPoint) => controlPoint.id === pointId);
    const platform = platforms.find((currentPlatform) => currentPlatform.id === platformId);

    if (!point || !platform) return;

    const routeType = getControlPointRoleForAircraft(platform.aircraft);

    if (point.type !== routeType) {
      alert(
        `${platform.aircraft || "This aircraft"} should be routed to a ${routeType.toUpperCase()}.`
      );
      return;
    }

    const routeLabel = formatControlPointLabel(point);
    const currentTrack = getLivePlatformTrack(platform, missionAnchor, airPictureTick);

    setPlatforms((currentPlatforms) =>
      currentPlatforms.map((currentPlatform) =>
        currentPlatform.id === platformId
          ? {
              ...currentPlatform,
              route: `Aircraft cleared to ${routeLabel}. Await established call.`,
              routeStatus: `ROUTING TO ${routeLabel}`,
              routeEstablishedAt: null,
              routedControlPoint: {
                id: point.id,
                type: point.type,
                name: point.name,
                label: routeLabel,
                position: point.position,
                mgrs: point.mgrs,
              },
              routePosition: point.position,
              routeAltitude:
                currentPlatform.routeAltitude ||
                getDefaultRouteAltitude(currentPlatform.aircraft),
              routeStartedAt: Date.now(),
              inboundStartPosition:
                currentTrack?.position || getInboundStartPosition(point.position),
              routedAt: new Date().toLocaleTimeString(),
              anchor: point.position,
            }
          : currentPlatform
      )
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

          {serialMode && pendingCheckIn && (
            <div className="serialCard routeCard">
              <small>Pending aircraft</small>
              <p>
                {pendingCheckIn.aircraftLabel} /{" "}
                {pendingCheckIn.routeStatus || "AWAITING TROOP ROUTE"}
              </p>
              {pendingCheckIn.routedControlPoint && (
                <p>Icon shown at {pendingCheckIn.routedControlPoint.label}.</p>
              )}
            </div>
          )}

          {platforms.map((platform) => (
            <div key={platform.id} className="platformCard">
              <strong>{platform.callsign}</strong>
              <span>{platform.aircraft}</span>
              <small>{platform.positionAltitude}</small>
              <small>PLAYTIME: {platform.playtime}</small>
              <small>DL: {platform.downlinkCode}</small>
              <small>{platform.status}</small>
              {platform.routeStatus && <small>{platform.routeStatus}</small>}
              {controlPoints.length > 0 && (
                <label className="routeSelect">
                  Reroute
                  <select
                    value={platform.routedControlPoint?.id || ""}
                    onChange={(event) =>
                      routeCheckedInPlatform(platform.id, event.target.value)
                    }
                  >
                    <option value="">Select IP/BP</option>
                    {getRouteableControlPoints(controlPoints, platform.aircraft).map(
                      (point) => (
                        <option key={point.id} value={point.id}>
                          {formatControlPointLabel(point)}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}
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

          {serialMode && pendingCheckIn && (
            <div className="serialCard routeCard">
              <small>Aircraft routing</small>
              <p>
                {pendingCheckIn.aircraftLabel} /{" "}
                {pendingCheckIn.routeStatus || "AWAITING TROOP ROUTE"}
              </p>

              {controlPoints.length === 0 ? (
                <p className="emptyText">Add or receive an IP/BP before routing.</p>
              ) : (
                <>
                <label className="routeHeightControl">
                  Requested height block
                  <select
                    value={
                      pendingCheckIn.routeAltitude ||
                      getDefaultRouteAltitude(
                        pendingCheckIn.aircraftLabel || pendingCheckIn.aircraftId
                      )
                    }
                    onChange={(event) =>
                      updatePendingRouteAltitude(event.target.value)
                    }
                  >
                    {heightBlockOptions.map((altitude) => (
                      <option key={altitude} value={altitude}>
                        {altitude}
                      </option>
                    ))}
                  </select>
                </label>
                {getRouteableControlPoints(
                  controlPoints,
                  pendingCheckIn.aircraftLabel || pendingCheckIn.aircraftId
                ).map((point) => (
                  <button
                    key={`${point.id}-route`}
                    className={
                      pendingCheckIn.routedControlPoint?.id === point.id
                        ? "activeMode"
                        : ""
                    }
                    onClick={() => routePendingAircraft(point)}
                  >
                    Route To {formatControlPointLabel(point)}
                    <span>{formatMgrs(point.position)}</span>
                  </button>
                ))}
                </>
              )}
            </div>
          )}

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
                <small>{formatMgrs(point.position)}</small>
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

        <div className="deconflictionPanel mapDeconflictionPanel">
          <h3>Airspace Deconfliction</h3>
          {platforms.length === 0 ? (
            <p className="emptyText">No checked-in aircraft on station.</p>
          ) : (
            <div className="deconflictionList">
              {platforms.map((platform) => (
                <div key={platform.id} className="deconflictionRow">
                  <div>
                    <strong>{platform.callsign}</strong>
                    <span>{platform.aircraft}</span>
                    <small>
                      {platform.routedControlPoint?.label || "NO IP/BP"} /{" "}
                      {platform.routePosition
                        ? formatMgrs(platform.routePosition)
                        : "GRID NOT SET"}
                    </small>
                  </div>
                  <label>
                    Height
                    <select
                      value={extractHeightBlock(platform.positionAltitude)}
                      onChange={(event) =>
                        updatePlatformHeight(platform.id, event.target.value)
                      }
                    >
                      {heightBlockOptions.map((altitude) => (
                        <option key={altitude} value={altitude}>
                          {altitude}
                        </option>
                      ))}
                    </select>
                  </label>
                  {controlPoints.length > 0 && (
                    <label>
                      Route
                      <select
                        value={platform.routedControlPoint?.id || ""}
                        onChange={(event) =>
                          routeCheckedInPlatform(platform.id, event.target.value)
                        }
                      >
                        <option value="">Select</option>
                        {getRouteableControlPoints(controlPoints, platform.aircraft).map(
                          (point) => (
                            <option key={point.id} value={point.id}>
                              {formatControlPointLabel(point)}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
          {pendingRouteLine && (
            <PendingRouteLine from={pendingRouteLine.from} to={pendingRouteLine.to} />
          )}
          {platformRouteLines.map((line) => (
            <PendingRouteLine key={line.id} from={line.from} to={line.to} />
          ))}
          {showAllPlatforms ? (
            <>
              {visibleAirPlatforms.map((platform) => (
                <AirPlatformMarker key={platform.id} platform={platform} />
              ))}
              <AirPlatformMarker platform={routedPendingPlatform} />
            </>
          ) : (
            <>
              <AirPlatformMarker platform={airPlatformPosition} />
              <AirPlatformMarker platform={routedPendingPlatform} />
            </>
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
        <AirPlatformLocator
          platform={routedPendingPlatform}
          mapCenter={position}
          zoom={zoom}
          alwaysVisible={true}
          index={visibleAirPlatforms.length}
        />
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
  const trackAnchor = platform.routePosition || platform.anchor || anchor;
  const orbitCenter = getStandoffOrbitCenter(
    trackAnchor,
    altitudeProfile,
    platformProfile
  );
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

function getLivePlatformTrack(platform, anchor, tick) {
  if (platform.routePosition && platform.routeStartedAt && !platform.routeEstablishedAt) {
    return getInboundPlatformTrack(platform, tick);
  }

  return getPlatformTrack(platform, anchor, tick);
}

function getInboundPlatformTrack(platform, tick) {
  const routePosition = platform.routePosition;
  const routeStartedAt = platform.routeStartedAt || Date.now();
  const elapsed = Date.now() - routeStartedAt;
  const inboundProgress = Math.min(
    1,
    Math.max(0, elapsed / getRouteTransitDurationMs(platform))
  );
  const inboundStart =
    platform.inboundStartPosition || getInboundStartPosition(routePosition);
  const position = interpolatePosition(
    inboundStart,
    routePosition,
    easeInOut(inboundProgress)
  );

  return {
    id: platform.id,
    position,
    routePosition,
    callsign: platform.callsign,
    aircraft: platform.aircraft,
    altitude: formatSpeedLabel(platform.aircraft),
    mode: `Routing to ${platform.routedControlPoint?.label || "IP/BP"}`,
    routePhase: "inbound",
  };
}

function getPendingPlatformTrack(pendingCheckIn, tick) {
  const routePosition = pendingCheckIn.routePosition;
  const routeStartedAt = pendingCheckIn.routeStartedAt || Date.now();
  const elapsed = Date.now() - routeStartedAt;
  const inboundProgress = Math.min(
    1,
    Math.max(0, elapsed / getRouteTransitDurationMs(pendingCheckIn))
  );
  const inboundStart =
    pendingCheckIn.inboundStartPosition || getInboundStartPosition(routePosition);
  const aircraft = pendingCheckIn.aircraftLabel || "Pending aircraft";

  if (inboundProgress < 1) {
    const position = interpolatePosition(
      inboundStart,
      routePosition,
      easeInOut(inboundProgress)
    );

    return {
      id: `${pendingCheckIn.id}-inbound`,
      callsign: aircraft,
      aircraft,
      position,
      altitude: formatSpeedLabel(aircraft),
      mode: `Routing to ${pendingCheckIn.routedControlPoint?.label || "IP/BP"}`,
      routePhase: "inbound",
    };
  }

  const holdingPlatform = {
    id: `${pendingCheckIn.id}-holding`,
    callsign: aircraft,
    aircraft,
    positionAltitude: pendingCheckIn.routeAltitude || "18000 FT",
    routePosition,
  };

  return {
    ...getPlatformTrack(holdingPlatform, routePosition, tick + 4000),
    altitude: pendingCheckIn.routeStatus,
    mode: pendingCheckIn.routeEstablishedAt ? "Established" : "Awaiting check-in",
    routePhase: "holding",
  };
}

function isRotaryWingAircraft(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  return ["APACHE", "AH-64", "TIGER", "AH-1", "COBRA", "HELI"].some((term) =>
    normalisedAircraft.includes(term)
  );
}

function isUavAircraft(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  return ["MQ-9", "REAPER", "WATCHKEEPER", "UAV", "RPAS"].some((term) =>
    normalisedAircraft.includes(term)
  );
}

function getControlPointRoleForAircraft(aircraft = "") {
  if (isRotaryWingAircraft(aircraft)) {
    return "bp";
  }

  return "ip";
}

function getRouteableControlPoints(controlPoints, aircraft = "") {
  const preferredType = getControlPointRoleForAircraft(aircraft);
  const preferredPoints = controlPoints.filter((point) => point.type === preferredType);

  return preferredPoints.length > 0 ? preferredPoints : controlPoints;
}

function getRouteTransitDurationMs(pendingCheckIn) {
  const from =
    pendingCheckIn.inboundStartPosition ||
    getInboundStartPosition(pendingCheckIn.routePosition);
  const to = pendingCheckIn.routePosition;
  const distanceMetres = getDistanceMetres(from, to);
  const speedMps = getTransitSpeedMps(
    pendingCheckIn.aircraftLabel || pendingCheckIn.aircraft || pendingCheckIn.aircraftId
  );

  const realWorldDuration = (distanceMetres / speedMps) * 1000;

  return Math.min(45000, Math.max(20000, realWorldDuration * 0.08));
}

function getTransitSpeedMps(aircraft = "") {
  const profile = getPlatformProfile(aircraft);

  if (profile.path === "heliPatrol") return 42;
  if (profile.path === "uavOrbit") return 75;

  return profile.speedMps || 180;
}

function formatSpeedLabel(aircraft = "") {
  const knots = Math.round(getTransitSpeedMps(aircraft) * 1.94384);

  return `Inbound ${knots} KT`;
}

function getDistanceMetres(from, to) {
  if (!from || !to) return 0;

  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos(toRadians((from.lat + to.lat) / 2));
  const eastMetres = (to.lng - from.lng) * metresPerDegreeLng;
  const northMetres = (to.lat - from.lat) * metresPerDegreeLat;

  return Math.hypot(eastMetres, northMetres);
}

function formatControlPointLabel(point) {
  const type = (point.type || "ip").toUpperCase();
  const rawName = String(point.name || "").trim().toUpperCase();

  if (rawName.startsWith(`${type} `)) return rawName;

  return `${type} ${rawName || "CONTROL"}`;
}

function getInboundStartPosition(routePosition) {
  return offsetPosition(routePosition, -42000, -22000);
}

function getDefaultRouteAltitude(aircraft = "") {
  if (isRotaryWingAircraft(aircraft)) {
    return "1000 FT";
  }

  if (isUavAircraft(aircraft)) {
    return "18000 FT";
  }

  return "15000 FT";
}

function extractHeightBlock(positionAltitude = "") {
  const feetMatch = positionAltitude.match(/(\d{3,5})\s*FT/i);
  const angelsMatch = positionAltitude.match(/ANGELS\s*(\d+)/i);

  if (feetMatch) {
    const rounded = Math.max(1000, Math.round(Number(feetMatch[1]) / 1000) * 1000);
    return `${Math.min(30000, rounded)} FT`;
  }

  if (angelsMatch) {
    return `${Math.min(30000, Number(angelsMatch[1]) * 1000)} FT`;
  }

  return "1000 FT";
}

function replaceAltitude(positionAltitude = "", altitude) {
  if (!positionAltitude) return altitude;

  if (/ANGELS\s*\d+|\d{3,5}\s*FT|LOW LEVEL/i.test(positionAltitude)) {
    return positionAltitude.replace(
      /ANGELS\s*\d+|\d{3,5}\s*FT|LOW LEVEL/i,
      altitude
    );
  }

  return `${positionAltitude}, ${altitude}`;
}

function interpolatePosition(from, to, progress) {
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
  };
}

function easeInOut(progress) {
  return progress * progress * (3 - 2 * progress);
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

  if (isUavAircraft(aircraft)) {
    return {
      label: "ISR ORBIT",
      path: "uavOrbit",
      orbitScale: 1.45,
      speedMps: 42,
      rotation: 32,
      drift: 110,
      standoffMetres: 1200,
    };
  }

  if (isRotaryWingAircraft(aircraft)) {
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

  if (normalisedAircraft.includes("A-10")) {
    return {
      label: "CAS RACETRACK",
      path: "fastRacetrack",
      orbitScale: 3.9,
      speedMps: 125,
      rotation: 30,
      drift: 0,
      standoffMetres: 6500,
    };
  }

  if (normalisedAircraft.includes("AC-130")) {
    return {
      label: "GUNSHIP ORBIT",
      path: "uavOrbit",
      orbitScale: 3.8,
      speedMps: 105,
      rotation: 28,
      drift: 260,
      standoffMetres: 4800,
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

  if (
    ["TYPHOON", "F-16", "F-15", "F/A-18", "FA-18", "RAFALE", "GRIPEN", "TORNADO"].some(
      (term) => normalisedAircraft.includes(term)
    )
  ) {
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
