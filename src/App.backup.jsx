import { useEffect, useState } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import * as mgrs from "mgrs";
import "./App.css";

function MapCentreTracker({ setPosition }) {
  const map = useMap();
  useEffect(() => {
  if (!map) return;

  const listener = map.addListener("idle", () => {
    const centre = map.getCenter();

    if (!centre) return;

    setPosition({
      lat: centre.lat(),
      lng: centre.lng(),
    });
  });

  return () => listener.remove();
}, [map, setPosition]);

  function updateCentre() {
    if (!map) return;

    const centre = map.getCenter();

    if (!centre) return;

    setPosition({
      lat: centre.lat(),
      lng: centre.lng(),
    });
  }

  return (
    <button className="hiddenButton" onClick={updateCentre}>
      Update Centre
    </button>
  );
}
export default function App() {
  const [page, setPage] = useState("home");
  const [mgrsInput, setMgrsInput] = useState("");
  const [position, setPosition] = useState({ lat: 51.5072, lng: -0.1276 });
  const [mapType, setMapType] = useState("satellite");
const [zoom, setZoom] = useState(13);
const [mapResetKey, setMapResetKey] = useState(0);

  function plotMgrs() {
    try {
      const [lng, lat] = mgrs.toPoint(mgrsInput.trim());
      setPosition({ lat, lng });
    } catch {
      alert("Invalid MGRS grid");
    }
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div className="app">
        <nav className="nav">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("tacp")}>TACP Training</button>
          <button onClick={() => setPage("nine")}>9-Line / TACAM</button>
          <button onClick={() => setPage("map")}>Map Trainer</button>
        </nav>

        {page === "home" && (
          <main className="page">
            <h1>VINTAGE TACP Trainer</h1>
            <p>UK/NATO-focused TACP training suite.</p>

            <div className="grid">
              <div className="card">Mission Generator</div>
              <div className="card">Check-In Trainer</div>
              <div className="card">Scenario Player</div>
              <div className="card">Map Reading</div>
            </div>
          </main>
        )}

        {page === "tacp" && (
          <main className="page">
            <h1>TACP Training</h1>
            <p>Training only. Not for live operations.</p>

            <div className="card">
              <h2>CAS Stage 1</h2>
              <p>Aircraft check-in and initial admin practice.</p>
            </div>

            <div className="card">
              <h2>CAS Stage 2</h2>
              <p>Situation update and battlespace awareness.</p>
            </div>

            <div className="card">
              <h2>CAS Stage 3</h2>
              <p>Game plan, talk-on, and coordination practice.</p>
            </div>
          </main>
        )}

        {page === "nine" && (
          <main className="page">
            <h1>9-Line / TACAM Trainer</h1>

            {[
              "IP / BP",
              "Heading",
              "Distance",
              "Target elevation",
              "Target description",
              "Target location",
              "Mark",
              "Friendlies",
              "Egress",
              "Remarks / restrictions",
            ].map((field, index) => (
              <label key={field} className="field">
                {index + 1}. {field}
                <textarea placeholder={`Enter ${field}`} />
              </label>
            ))}
          </main>
        )}

        {page === "map" && (
          <main className="mapPage">
            <section className="mapControls">
              <h1>Map Reading Trainer</h1>

<input
  value={mgrsInput}
onChange={(e) => {
  let value = e.target.value.toUpperCase().replace(/\s/g, "");

  // MGRS shape: 1-2 digits, then 3 letters, then up to 10 digits
  const valid = /^(\d{0,2})([A-Z]{0,3})(\d{0,10})$/.test(value);

  if (valid) {
    setMgrsInput(value);
  }
}}
  placeholder="Enter MGRS grid"
/>

              <button onClick={plotMgrs}>Plot MGRS</button>
<button
  onClick={() => {
    setMgrsInput("");
  }}
>
  Clear MGRS
</button>

              <select
                value={mapType}
                onChange={(e) => setMapType(e.target.value)}
              >
                <option value="terrain">Terrain</option>
                <option value="satellite">Satellite</option>
                <option value="roadmap">Road Map</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <div className="zoomControls">
  <button onClick={() => setZoom(zoom + 1)}>Zoom In</button>
  <button onClick={() => setZoom(zoom - 1)}>Zoom Out</button>
  <button onClick={() => setPosition(position)}>
  <button onClick={() => setMapResetKey(mapResetKey + 1)}>
  Centre on Crosshair
</button>
</button>
</div>

              <>
<div className="targetData">
  <h2>TARGET DATA</h2>

  <div className="dataRow">
    <span>MGRS</span>
    <strong>{mgrs.forward([position.lng, position.lat])}</strong>
  </div>

  <div className="dataRow">
    <span>LAT</span>
    <strong>{position.lat.toFixed(6)}</strong>
  </div>

  <div className="dataRow">
    <span>LNG</span>
    <strong>{position.lng.toFixed(6)}</strong>
  </div>

  <div className="dataRow">
    <span>ZOOM</span>
    <strong>{zoom}</strong>
  </div>

  <div className="dataRow">
    <span>MAP</span>
    <strong>{mapType.toUpperCase()}</strong>
  </div>
</div>
</>
<div className="card">
  <h2>Training Notes</h2>
  <p>Ground-to-map drills will go here.</p>
  <p>Map-to-ground drills will go here.</p>
  <p>Bearing practice will go here.</p>
  <p>Distance estimation will go here.</p>
  <p>Terrain feature identification will go here.</p>
  <p>Contour reading will go here.</p>
  <p>More training content...</p>
  <p>More training content...</p>
  <p>More training content...</p>
</div>

            </section>

            <section className="mapBox">
             <Map
             key={mapResetKey}
  defaultCenter={position}
 zoom={zoom}
  mapTypeId={mapType}
  gestureHandling="auto"
  disableDefaultUI={true}
>
<MapCentreTracker setPosition={setPosition} />
</Map>

<div className="crosshairOverlay">
  <div className="crosshair">
    <div className="crosshairCenter"></div>
  </div>
</div>
            </section>
          </main>
        )}
      </div>
    </APIProvider>
  );
}
