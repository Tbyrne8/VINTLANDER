import { useState } from "react";
import * as mgrs from "mgrs";

export default function TargetData({ position, zoom, mapType }) {
  const [copied, setCopied] = useState(false);
const rawMgrs = mgrs.forward([position.lng, position.lat]);

const currentMgrs = rawMgrs.replace(
  /^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/,
  "$1 $2 $3 $4"
);

  async function copyMgrs() {
    try {
      await navigator.clipboard.writeText(currentMgrs);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      alert("Could not copy MGRS.");
    }
  }

  return (
    <div className="targetData">
      <h2>TARGET DATA</h2>

      <div className="dataRow">
        <span>MGRS</span>
        <strong>{currentMgrs}</strong>
      </div>

      <button onClick={copyMgrs}>
        {copied ? "Copied!" : "Copy MGRS"}
      </button>

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
  );
}