import { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import "./App.css";

import Home from "./pages/Home.jsx";
import TacpTraining from "./pages/TacpTraining.jsx";
import NineLine from "./pages/NineLine.jsx";
import MapTrainer from "./pages/MapTrainer.jsx";
import CheckIn from "./pages/CheckIn.jsx";

const savedPlatforms = "vintlander.platforms";
const missionStorageKeys = [
  "vintlander.platforms",
  "vintlander.targets",
  "vintlander.observerPosition",
  "vintlander.intelInjects",
  "vintlander.targetDevelopmentStatus",
  "vintlander.attackBriefs",
  "vintlander.trainingLogs",
  "vintlander.pendingCheckIn",
  "vintlander.attackStatus",
];

function loadSavedPlatforms() {
  try {
    const saved = window.localStorage.getItem(savedPlatforms);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [page, setPage] = useState("home");
  const [serialMode, setSerialMode] = useState(false);
  const [platforms, setPlatforms] = useState(loadSavedPlatforms);

  useEffect(() => {
    window.localStorage.setItem(savedPlatforms, JSON.stringify(platforms));
  }, [platforms]);

  function goToPage(nextPage) {
    setPage(nextPage);
  }

  function startFullSerial() {
    setSerialMode(true);
    setPage("tacp");
  }

  function exitSerial() {
    setSerialMode(false);
    setPage("home");
  }

  function clearTrainingData() {
    const confirmed = window.confirm(
      "Clear all standalone training data, including aircraft, OP, targets, intel, attack briefs and logs?"
    );

    if (!confirmed) return;

    missionStorageKeys.forEach((key) => window.localStorage.removeItem(key));
    setPlatforms([]);
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
            <strong>FULL SERIAL</strong>
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
            onClearTrainingData={clearTrainingData}
          />
        )}
        {page === "tacp" && (
          <TacpTraining
            platforms={platforms}
            onNavigate={goToPage}
            serialMode={serialMode}
            onExitSerial={exitSerial}
          />
        )}
        {page === "nine" && (
          <NineLine
            platforms={platforms}
            onNavigate={goToPage}
            serialMode={serialMode}
          />
        )}
        {page === "map" && (
          <MapTrainer
            platforms={platforms}
            setPlatforms={setPlatforms}
            onNavigate={goToPage}
            serialMode={serialMode}
          />
        )}
        {page === "checkin" && (
          <CheckIn
            platforms={platforms}
            setPlatforms={setPlatforms}
            onNavigate={goToPage}
            serialMode={serialMode}
          />
        )}
      </div>
    </APIProvider>
  );
}
