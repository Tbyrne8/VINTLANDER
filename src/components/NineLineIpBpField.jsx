import { useEffect, useMemo } from "react";
import {
  cardinalDirections,
  formatNineLineControlPoint,
  formatOffsetReference,
  getNineLineControlPointType,
} from "../utils/nineLineControlPoint.js";

export default function NineLineIpBpField({
  brief,
  platform,
  controlPoints = [],
  updateBrief,
}) {
  const mode = brief.ipBpMode || "mapped";
  const aircraft = platform?.aircraft || "";
  const requiredType = getNineLineControlPointType(aircraft);
  const resolvedMode =
    mode === "mapped"
      ? requiredType === "bp"
        ? "mappedBp"
        : "mappedIp"
      : mode;
  const selectedType = resolvedMode === "mappedBp" ? "bp" : "ip";
  const availablePoints = useMemo(
    () => controlPoints.filter((point) => point.type === selectedType),
    [controlPoints, selectedType]
  );
  const availableLabels = useMemo(
    () => availablePoints.map(formatNineLineControlPoint),
    [availablePoints]
  );

  useEffect(() => {
    if (!resolvedMode.startsWith("mapped")) return;
    if (availableLabels.includes(brief.ipBp)) return;

    updateBrief("ipBp", availableLabels[0] || "CURRENT HOLD");
  }, [availableLabels, brief.ipBp, resolvedMode, updateBrief]);

  function setMode(nextMode) {
    updateBrief("ipBpMode", nextMode);
    updateBrief(
      "ipBp",
      nextMode.startsWith("mapped")
        ? controlPoints
            .filter((point) => point.type === (nextMode === "mappedBp" ? "bp" : "ip"))
            .map(formatNineLineControlPoint)[0] || "CURRENT HOLD"
        : formatOffsetReference(
            brief.ipBpDistance || "5 NM",
            brief.ipBpDirection || "NORTH"
          )
    );
  }

  function setOffset(field, value) {
    const distance = field === "ipBpDistance" ? value : brief.ipBpDistance || "5 NM";
    const direction = field === "ipBpDirection" ? value : brief.ipBpDirection || "NORTH";
    updateBrief(field, value);
    updateBrief("ipBp", formatOffsetReference(distance, direction));
  }

  return (
    <div className="nineLineControlPointField">
      <label className="field">
        Line 1 reference
        <select value={resolvedMode} onChange={(event) => setMode(event.target.value)}>
          <option value="mappedIp">Mapped IP (fixed-wing)</option>
          <option value="mappedBp">Mapped BP (helicopter)</option>
          <option value="offset">Distance / cardinal direction</option>
        </select>
      </label>

      {resolvedMode.startsWith("mapped") ? (
        <label className="field">
          {selectedType.toUpperCase()}
          <select
            value={availableLabels.includes(brief.ipBp) ? brief.ipBp : ""}
            onChange={(event) => updateBrief("ipBp", event.target.value)}
          >
            {!availablePoints.length && (
              <option value="">No {selectedType.toUpperCase()} markers on map</option>
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
      ) : (
        <div className="grid compactGrid">
          <label className="field">
            Distance
            <input
              value={brief.ipBpDistance || "5 NM"}
              onChange={(event) =>
                setOffset("ipBpDistance", event.target.value.toUpperCase())
              }
              placeholder="Example: 5 NM"
            />
          </label>
          <label className="field">
            Cardinal direction
            <select
              value={brief.ipBpDirection || "NORTH"}
              onChange={(event) => setOffset("ipBpDirection", event.target.value)}
            >
              {cardinalDirections.map((direction) => (
                <option key={direction}>{direction}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
