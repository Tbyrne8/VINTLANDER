import { useEffect, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import "./App.css";

import Home from "./pages/Home.jsx";
import TacpTraining from "./pages/TacpTraining.jsx";
import NineLine from "./pages/NineLine.jsx";
import MapTrainer from "./pages/MapTrainer.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import LinkedSerialLauncher from "./components/LinkedSerialLauncher.jsx";
import {
  createLinkedSession,
  joinLinkedSession,
  publishLinkedState,
  watchLinkedSession,
} from "./utils/linkedSession.js";

const savedPlatforms = "vintlander.platforms";
const savedStandalonePlatforms = "vintlander.standalone.platforms";
const missionStorageKeys = [
  "vintlander.standalone.platforms",
  "vintlander.standalone.targets",
  "vintlander.standalone.observerPosition",
  "vintlander.standalone.controlPoints",
  "vintlander.standalone.mapCenter",
  "vintlander.standalone.artillery",
  "vintlander.intelInjects",
  "vintlander.targetDevelopmentStatus",
  "vintlander.attackBriefs",
  "vintlander.trainingLogs",
  "vintlander.pendingCheckIn",
  "vintlander.stagedCheckIn",
  "vintlander.attackStatus",
  "vintlander.missionEvents",
  "vintlander.controlPoints",
  "vintlander.controller",
  "vintlander.completedTasks",
  "vintlander.artillery",
];
const serialStorageKeys = [
  "vintlander.targets",
  "vintlander.observerPosition",
  "vintlander.intelInjects",
  "vintlander.targetDevelopmentStatus",
  "vintlander.attackBriefs",
  "vintlander.trainingLogs",
  "vintlander.pendingCheckIn",
  "vintlander.stagedCheckIn",
  "vintlander.attackStatus",
  "vintlander.missionEvents",
  "vintlander.controlPoints",
  "vintlander.controller",
  "vintlander.completedTasks",
  "vintlander.artillery",
];
const linkedStorageKeys = [
  ...new Set([
    ...serialStorageKeys,
    "vintlander.controllerCallsigns",
    "vintlander.controller",
    "vintlander.completedTasks",
    "vintlander.opHistory",
    "vintlander.mapCenter",
  ]),
];

function collectLinkedState(platforms, origin) {
  const storage = {};
  linkedStorageKeys.forEach((key) => {
    const value = window.localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  });
  return { origin, storage, platforms };
}

function linkedStateSignature(state) {
  return JSON.stringify({ storage: state?.storage || {}, platforms: state?.platforms || [] });
}

function loadSavedPlatforms() {
  return loadSavedPlatformList(savedPlatforms);
}

function loadSavedStandalonePlatforms() {
  return loadSavedPlatformList(savedStandalonePlatforms);
}

function loadSavedPlatformList(key) {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [page, setPage] = useState("home");
  const [serialMode, setSerialMode] = useState(false);
  const [serialVariant, setSerialVariant] = useState("ds");
  const [platforms, setPlatforms] = useState(loadSavedPlatforms);
  const [standalonePlatforms, setStandalonePlatforms] = useState(
    loadSavedStandalonePlatforms
  );
  const [linkedSession, setLinkedSession] = useState(null);
  const [linkedBusy, setLinkedBusy] = useState(false);
  const [linkedError, setLinkedError] = useState("");
  const linkedClientId = useRef(
    `CLIENT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const lastLinkedSignature = useRef("");
  const platformsRef = useRef(platforms);
  const activePlatforms = serialMode ? platforms : standalonePlatforms;
  const setActivePlatforms = serialMode ? setPlatforms : setStandalonePlatforms;

  useEffect(() => {
    window.localStorage.setItem(savedPlatforms, JSON.stringify(platforms));
    platformsRef.current = platforms;
  }, [platforms]);

  useEffect(() => {
    if (!linkedSession) return undefined;

    const applyRemoteState = (state, status) => {
      if (status === "ended") {
        setLinkedError("The linked serial has been ended by the other laptop.");
        setLinkedSession(null);
        return;
      }
      if (!state || state.origin === linkedClientId.current) return;
      linkedStorageKeys.forEach((key) => {
        if (Object.hasOwn(state.storage || {}, key)) {
          window.localStorage.setItem(key, state.storage[key]);
        } else {
          window.localStorage.removeItem(key);
        }
      });
      if (Array.isArray(state.platforms)) {
        platformsRef.current = state.platforms;
        setPlatforms(state.platforms);
      }
      lastLinkedSignature.current = linkedStateSignature(state);
      window.dispatchEvent(new CustomEvent("vintlander:linked-sync"));
    };

    const stopWatching = watchLinkedSession(
      linkedSession.code,
      applyRemoteState,
      () => setLinkedError("Connection interrupted. Reconnecting…")
    );
    const publishTimer = window.setInterval(async () => {
      const state = collectLinkedState(platformsRef.current, linkedClientId.current);
      const signature = linkedStateSignature(state);
      if (signature === lastLinkedSignature.current) return;
      lastLinkedSignature.current = signature;
      try {
        await publishLinkedState(linkedSession.code, state);
        setLinkedError("");
      } catch {
        setLinkedError("Could not send the latest mission update.");
      }
    }, 750);

    return () => {
      stopWatching();
      window.clearInterval(publishTimer);
    };
  }, [linkedSession]);

  useEffect(() => {
    window.localStorage.setItem(
      savedStandalonePlatforms,
      JSON.stringify(standalonePlatforms)
    );
  }, [standalonePlatforms]);

  function goToPage(nextPage) {
    setPage(nextPage);
  }

  function startFullSerial() {
    setSerialVariant("ds");
    setSerialMode(true);
    setPage("tacp");
  }

  function startSelfLedSerial() {
    setSerialVariant("self");
    setSerialMode(true);
    setPage("tacp");
  }

  async function createLinkedSerial() {
    setLinkedBusy(true);
    setLinkedError("");
    try {
      setSerialVariant("ds");
      setSerialMode(true);
      setPage("tacp");
      const state = collectLinkedState(platforms, linkedClientId.current);
      const code = await createLinkedSession(state);
      lastLinkedSignature.current = linkedStateSignature(state);
      setLinkedSession({ code, role: "trainee" });
    } catch (error) {
      setLinkedError(error.message || "Could not create the linked serial.");
      setSerialMode(false);
      setPage("home");
    } finally {
      setLinkedBusy(false);
    }
  }

  async function joinLinkedSerial(code) {
    setLinkedBusy(true);
    setLinkedError("");
    try {
      const joined = await joinLinkedSession(code);
      const state = joined.state || {};
      linkedStorageKeys.forEach((key) => {
        if (Object.hasOwn(state.storage || {}, key)) {
          window.localStorage.setItem(key, state.storage[key]);
        } else {
          window.localStorage.removeItem(key);
        }
      });
      const joinedPlatforms = Array.isArray(state.platforms) ? state.platforms : [];
      platformsRef.current = joinedPlatforms;
      setPlatforms(joinedPlatforms);
      lastLinkedSignature.current = linkedStateSignature(state);
      setSerialVariant("ds");
      setSerialMode(true);
      setPage("tacp");
      setLinkedSession({ code: joined.code, role: "ds" });
    } catch (error) {
      setLinkedError(error.message || "Could not join the linked serial.");
    } finally {
      setLinkedBusy(false);
    }
  }

  function exitSerial() {
    const resetSerial = window.confirm(
      "Reset this serial before returning to the main menu? Press OK for a fresh serial next time, or Cancel to keep current serial data."
    );

    if (resetSerial) {
      serialStorageKeys.forEach((key) => window.localStorage.removeItem(key));
      setPlatforms([]);
    }

    setSerialMode(false);
    setSerialVariant("ds");
    setLinkedSession(null);
    setPage("home");
  }

  function clearTrainingData() {
    const confirmed = window.confirm(
      "Clear all standalone training data, including aircraft, OP, targets, intel, attack briefs and logs?"
    );

    if (!confirmed) return;

    missionStorageKeys.forEach((key) => window.localStorage.removeItem(key));
    setStandalonePlatforms([]);
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div className={`app ${serialMode ? "serialMode" : ""}`}>
        {linkedSession && (
          <div className="linkedSessionBar">
            <span className="linkedLiveDot" />
            <strong>LINKED {linkedSession.role === "ds" ? "DS" : "TRAINEE"}</strong>
            <span>Session {linkedSession.code}</span>
            {linkedError && <span className="linkedBarError">{linkedError}</span>}
            <button onClick={() => setLinkedSession(null)}>Leave Link</button>
          </div>
        )}
        {!serialMode && (
          <nav className="nav">
            <button onClick={() => goToPage("home")}>Home</button>
            <button onClick={() => goToPage("tacp")}>TACP Training</button>
            <button onClick={() => goToPage("nine")}>9-Line / TACAM</button>
            <button onClick={() => goToPage("map")}>Map Trainer</button>
            <button onClick={() => goToPage("checkin")}>Check-In</button>
          </nav>
        )}

        {serialMode && page !== "tacp" && (
          <div className="serialBar">
            <strong>
              {serialVariant === "self" ? "SELF-LED SERIAL" : "FULL SERIAL"}
            </strong>
            <div>
              <button onClick={() => goToPage("tacp")}>Return To Mission</button>
              <button onClick={exitSerial}>Exit To Main Menu</button>
            </div>
          </div>
        )}

        {page === "home" && (
          <>
            <Home
              onNavigate={goToPage}
              onStartSerial={startFullSerial}
              onStartSelfLedSerial={startSelfLedSerial}
              onClearTrainingData={clearTrainingData}
            />
            <LinkedSerialLauncher
              onCreate={createLinkedSerial}
              onJoin={joinLinkedSerial}
              busy={linkedBusy}
              error={linkedError}
            />
          </>
        )}
        {page === "tacp" && (
          <TacpTraining
            platforms={activePlatforms}
            setPlatforms={setActivePlatforms}
            onNavigate={goToPage}
            serialMode={serialMode}
            serialVariant={serialVariant}
            onExitSerial={exitSerial}
            linkedRole={linkedSession?.role || null}
          />
        )}
        {page === "nine" && (
          <NineLine
            platforms={activePlatforms}
            onNavigate={goToPage}
            serialMode={serialMode}
          />
        )}
        {page === "map" && (
          <MapTrainer
            platforms={activePlatforms}
            setPlatforms={setActivePlatforms}
            onNavigate={goToPage}
            serialMode={serialMode}
          />
        )}
        {page === "checkin" && (
          <CheckIn
            platforms={activePlatforms}
            setPlatforms={setActivePlatforms}
            onNavigate={goToPage}
            serialMode={serialMode}
            serialVariant={serialVariant}
          />
        )}
      </div>
    </APIProvider>
  );
}
