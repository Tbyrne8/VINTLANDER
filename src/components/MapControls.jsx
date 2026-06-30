export default function MapControls({
  mgrsInput,
  setMgrsInput,
  plotMgrs,
  mapType,
  setMapType,
  zoom,
  setZoom,
  mapResetKey,
  setMapResetKey,
}) {
  return (
    <>
      <input
        value={mgrsInput}
        onChange={(e) => {
          let value = e.target.value.toUpperCase().replace(/\s/g, "");

          const valid = /^(\d{0,2})([A-Z]{0,3})(\d{0,10})$/.test(value);

          if (valid) {
            setMgrsInput(value);
          }
        }}
        placeholder="Enter MGRS grid"
      />

      <button onClick={plotMgrs}>Plot MGRS</button>

      <button onClick={() => setMgrsInput("")}>Clear MGRS</button>

      <select value={mapType} onChange={(e) => setMapType(e.target.value)}>
        <option value="terrain">Terrain</option>
        <option value="satellite">Satellite</option>
        <option value="roadmap">Road Map</option>
        <option value="hybrid">Hybrid</option>
      </select>

      <div className="zoomControls">
        <button onClick={() => setZoom(zoom + 1)}>Zoom In</button>
        <button onClick={() => setZoom(zoom - 1)}>Zoom Out</button>
        <button onClick={() => setMapResetKey(mapResetKey + 1)}>
          Centre on Crosshair
        </button>
      </div>
    </>
  );
}