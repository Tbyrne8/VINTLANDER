import { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import "./App.css";

import Home from "./pages/Home.jsx";
import TacpTraining from "./pages/TacpTraining.jsx";
import NineLine from "./pages/NineLine.jsx";
import MapTrainer from "./pages/MapTrainer.jsx";
import CheckIn from "./pages/CheckIn.jsx";

const savedPlatforms = "vintlander.platforms";

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
  const [platforms, setPlatforms] = useState(loadSavedPlatforms);

  useEffect(() => {
    window.localStorage.setItem(savedPlatforms, JSON.stringify(platforms));
  }, [platforms]);

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div className="app">
        <nav className="nav">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("tacp")}>TACP Training</button>
          <button onClick={() => setPage("nine")}>9-Line / TACAM</button>
          <button onClick={() => setPage("map")}>Map Trainer</button>
          <button onClick={() => setPage("checkin")}>Check-In</button>
        </nav>

        {page === "home" && <Home />}
        {page === "tacp" && <TacpTraining />}
        {page === "nine" && <NineLine />}
        {page === "map" && (
          <MapTrainer platforms={platforms} setPlatforms={setPlatforms} />
        )}
        {page === "checkin" && (
          <CheckIn platforms={platforms} setPlatforms={setPlatforms} />
        )}
      </div>
    </APIProvider>
  );
}
