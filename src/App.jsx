import { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import "./App.css";

import Home from "./pages/Home.jsx";
import TacpTraining from "./pages/TacpTraining.jsx";
import NineLine from "./pages/NineLine.jsx";
import MapTrainer from "./pages/MapTrainer.jsx";
import CheckIn from "./pages/CheckIn.jsx";

const savedPlatforms = "vintlander.platforms";
const savedStandalonePlatforms = "vintlander.standalone.platforms";
const missionStorageKeys = [
  "vintlander.standalone.platforms",
  "vintlander.standalone.targets",
  "vintlander.standalone.observerPosition",
  "vintlander.standalone.controlPoints",
  "vintlander.standalone.mapCenter",
  "vintlander.intelInjects",
  "vintlander.targetDevelopmentStatus",
  "vintlander.attackBriefs",
  "vintlander.trainingLogs",
  "vintlander.pendingCheckIn",
  "vintlander.attackStatus",
  "vintlander.missionEvents",
  "vintlander.controlPoints",
];
const serialStorageKeys = [
  "vintlander.targets",
  "vintlander.observerPosition",
  "vintlander.intelInjects",
  "vintlander.targetDevelopmentStatus",
  "vintlander.attackBriefs",
  "vintlander.trainingLogs",
  "vintlander.pendingCheckIn",
  "vintlander.attackStatus",
  "vintlander.missionEvents",
  "vintlander.controlPoints",
];

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
  const activePlatforms = serialMode ? platforms : standalonePlatforms;
  const setActivePlatforms = serialMode ? setPlatforms : setStandalonePlatforms;

  useEffect(() => {
    window.localStorage.setItem(savedPlatforms, JSON.stringify(platforms));
  }, [platforms]);

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
          <Home
            onNavigate={goToPage}
            onStartSerial={startFullSerial}
            onStartSelfLedSerial={startSelfLedSerial}
            onClearTrainingData={clearTrainingData}
          />
        )}
        {page === "tacp" && (
          <TacpTraining
            platforms={activePlatforms}
            setPlatforms={setActivePlatforms}
            onNavigate={goToPage}
            serialMode={serialMode}
            serialVariant={serialVariant}
            onExitSerial={exitSerial}
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
          />
        )}
      </div>
    </APIProvider>
  );
}
