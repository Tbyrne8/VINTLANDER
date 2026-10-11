import { useEffect, useMemo } from "react";
import {
  formatNineLineControlPoint,
  getNineLineControlPointType,
  getNineLineControlPoints,
} from "../utils/nineLineControlPoint.js";
import {
  echoSectors,
  egressCardinalDirections,
  formatCardinalEgress,
  formatEchoEgress,
  normaliseEgressDistance,
} from "../utils/nineLineEgress.js";

export default function NineLineEgressField({
  brief,
  platform,
  controlPoints = [],
  updateBrief,
}) {
  const mode = brief.egressMode || "mapped";
  const aircraft = platform?.aircraft || "";
  const requiredType = getNineLineControlPointType(aircraft);
  const availablePoints = useMemo(
    () => getNineLineControlPoints(controlPoints, aircraft),
    [aircraft, controlPoints]
  );
  const availableLabels = useMemo(
    () => availablePoints.map(formatNineLineControlPoint),
    [availablePoints]
  );

  useEffect(() => {
    if (mode !== "mapped") return;
    if (availableLabels.includes(brief.egress)) return;
    updateBrief("egress", availableLabels[0] || "AS DIRECTED");
  }, [availableLabels, brief.egress, mode, updateBrief]);

  function setMode(nextMode) {
    updateBrief("egressMode", nextMode);

    if (nextMode === "mapped") {
      updateBrief("egress", availableLabels[0] || "AS DIRECTED");
    } else if (nextMode === "cardinal") {
      updateBrief(
        "egress",
        formatCardinalEgress(
          brief.egressDistanceNm || "5",
          brief.egressDirection || "NORTH"
        )
      );
    } else {
      updateBrief(
        "egress",
        formatEchoEgress(
          brief.echoPointGrid || "",
          brief.echoSector || "ALPHA",
          brief.echoDistanceNm || "5"
        )
      );
    }
  }

  function setCardinal(field, rawValue) {
    const value =
      field === "egressDistanceNm"
        ? normaliseEgressDistance(rawValue)
        : rawValue;
    const distance = field === "egressDistanceNm" ? value : brief.egressDistanceNm || "5";
    const direction = field === "egressDirection" ? value : brief.egressDirection || "NORTH";
    updateBrief(field, value);
    updateBrief("egress", formatCardinalEgress(distance, direction));
  }

  function setEcho(field, rawValue) {
    const value =
      field === "echoDistanceNm"
        ? normaliseEgressDistance(rawValue)
        : rawValue.toUpperCase();
    const grid = field === "echoPointGrid" ? value : brief.echoPointGrid || "";
    const sector = field === "echoSector" ? value : brief.echoSector || "ALPHA";
    const distance = field === "echoDistanceNm" ? value : brief.echoDistanceNm || "5";
    updateBrief(field, value);
    updateBrief("egress", formatEchoEgress(grid, sector, distance));
  }

  return (
    <div className="nineLineEgressField">
      <label className="field">
        Line 9 egress
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="mapped">To mapped {requiredType.toUpperCase()}</option>
          <option value="cardinal">Nautical miles / cardinal direction</option>
          <option value="echo">From Echo point</option>
        </select>
      </label>

      {mode === "mapped" && (
        <label className="field">
          Egress {requiredType.toUpperCase()}
          <select
            value={availableLabels.includes(brief.egress) ? brief.egress : ""}
            onChange={(event) => updateBrief("egress", event.target.value)}
          >
            {!availablePoints.length && (
              <option value="">No {requiredType.toUpperCase()} markers on map</option>
            )}
            {availablePoints.map((point) => {
              const label = formatNineLineControlPoint(point);
              return (
                <option key={point.id} value={label}>
                  {label} / {point.mgrs || "NO GRID"}
                </option>
              );
            })}
          </select>
        </label>
      )}

      {mode === "cardinal" && (
        <div className="grid compactGrid">
          <label className="field">
            Distance (nautical miles)
            <input
              type="number"
              min="0"
              max="999"
              step="0.1"
              value={brief.egressDistanceNm || "5"}
              onChange={(event) => setCardinal("egressDistanceNm", event.target.value)}
            />
          </label>
          <label className="field">
            Direction
            <select
              value={brief.egressDirection || "NORTH"}
              onChange={(event) => setCardinal("egressDirection", event.target.value)}
            >
              {egressCardinalDirections.map((direction) => (
                <option key={direction}>{direction}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {mode === "echo" && (
        <>
          <label className="field">
            Echo-point MGRS grid
            <input
              value={brief.echoPointGrid || ""}
              onChange={(event) => setEcho("echoPointGrid", event.target.value)}
              placeholder="Example: 30U WB 71301 73353"
            />
          </label>
          <div className="grid compactGrid">
            <label className="field">
              Sector
              <select
                value={brief.echoSector || "ALPHA"}
                onChange={(event) => setEcho("echoSector", event.target.value)}
              >
                {echoSectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.id} / {sector.direction}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Distance (nautical miles)
              <input
                type="number"
                min="0"
                max="999"
                step="0.1"
                value={brief.echoDistanceNm || "5"}
                onChange={(event) => setEcho("echoDistanceNm", event.target.value)}
              />
            </label>
          </div>
          <p className="emptyText">
            Alpha north · Bravo east · Charlie south · Delta west
          </p>
        </>
      )}
    </div>
  );
}
