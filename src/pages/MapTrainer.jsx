import { useState } from "react";
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

export default function MapTrainer() {
  const [mgrsInput, setMgrsInput] = useState("");
  const [position, setPosition] = useState({ lat: 51.5072, lng: -0.1276 });
  const [mapType, setMapType] = useState("satellite");
  const [zoom, setZoom] = useState(13);
  const [mapResetKey, setMapResetKey] = useState(0);
  const [targets, setTargets] = useState([]);
  const [observerPosition, setObserverPosition] = useState(null);
const [showObserverLine, setShowObserverLine] = useState(false);
const [contextMenu, setContextMenu] = useState(null);

  function plotMgrs() {
    try {
      const [lng, lat] = mgrs.toPoint(mgrsInput.trim());
      setPosition({ lat, lng });
      setMapResetKey((current) => current + 1);
    } catch {
      alert("Invalid MGRS grid");
    }
  }

  return (
    <main className="mapPage">
      <section className="mapControls">
        <h1>Mission Panel</h1>

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
<ObserverPanel
  observerPosition={observerPosition}
  setObserverPosition={setObserverPosition}
  position={position}
  setPosition={setPosition}
  setMapResetKey={setMapResetKey}
  showObserverLine={showObserverLine}
setShowObserverLine={setShowObserverLine}
/>

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
<ObserverMarker observerPosition={observerPosition} />
<ObserverLine
  observerPosition={observerPosition}
  position={position}
  showLine={showObserverLine}
/>
        </Map>

        <Crosshair />
        <MapContextMenu
  contextMenu={contextMenu}
  setContextMenu={setContextMenu}
  position={position}
  setObserverPosition={setObserverPosition}
/>
<IsrFeed position={position} targets={targets} />      </section>
    </main>
  );
}