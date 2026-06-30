import * as mgrs from "mgrs";
import {
  getBearingDegrees,
  getCompassDirection,
  getDistanceMetres,
} from "../utils/geo.js";

export default function ObserverPanel({
  observerPosition,
  setObserverPosition,
  position,
  setPosition,
  setMapResetKey,
  showObserverLine,
  setShowObserverLine,
}) {
  const hasObserver = Boolean(observerPosition);

  const distance = hasObserver
    ? getDistanceMetres(observerPosition, position)
    : null;

  const bearing = hasObserver
    ? getBearingDegrees(observerPosition, position)
    : null;

  const direction = hasObserver ? getCompassDirection(bearing) : null;

  function setOpHere() {
    setObserverPosition(position);
  }

  function goToOp() {
    if (!observerPosition) return;

    setPosition(observerPosition);
    setMapResetKey((current) => current + 1);
  }

  return (
    <div className="observerPanel">
      <h2>OBSERVER POSITION</h2>

      <button onClick={setOpHere}>Set OP at Crosshair</button>

      {hasObserver && (
        <>
          <button onClick={goToOp}>Centre on OP</button>
          <button onClick={() => setShowObserverLine(!showObserverLine)}>
            {showObserverLine ? "Hide OP Line" : "Show OP Line"}
          </button>

          <div className="dataRow">
            <span>OP GRID</span>
            <strong>
              {mgrs
                .forward([observerPosition.lng, observerPosition.lat])
                .replace(
                  /^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/,
                  "$1 $2 $3 $4"
                )}
            </strong>
          </div>

          <div className="dataRow">
            <span>BRG TO XHAIR</span>
            <strong>
              {bearing.toFixed(0)} deg / {direction}
            </strong>
          </div>

          <div className="dataRow">
            <span>DIST TO XHAIR</span>
            <strong>
              {distance >= 1000
                ? `${(distance / 1000).toFixed(2)} km`
                : `${distance.toFixed(0)} m`}
            </strong>
          </div>
        </>
      )}

      {!hasObserver && (
        <p className="emptyText">
          No OP set. Move crosshair to your position and press Set OP.
        </p>
      )}
    </div>
  );
}
