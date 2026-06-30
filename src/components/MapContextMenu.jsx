import * as mgrs from "mgrs";

export default function MapContextMenu({
  contextMenu,
  setContextMenu,
  position,
  setObserverPosition,
}) {
  if (!contextMenu) return null;

  const currentMgrs = mgrs
    .forward([position.lng, position.lat])
    .replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/, "$1 $2 $3 $4");

  async function copyGrid() {
    try {
      await navigator.clipboard.writeText(currentMgrs);
      setContextMenu(null);
    } catch {
      alert("Could not copy grid.");
    }
  }

  function setOp() {
    setObserverPosition(position);
    setContextMenu(null);
  }

  return (
    <div
      className="mapContextMenu"
      style={{
        left: contextMenu.x,
        top: contextMenu.y,
      }}
    >
      <button onClick={setOp}>Set OP Here</button>
      <button onClick={copyGrid}>Copy MGRS</button>
      <button onClick={() => setContextMenu(null)}>Close</button>
    </div>
  );
}