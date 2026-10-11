import { useEffect, useMemo } from "react";
import {
  formatManualFriendly,
  friendlyDirections,
  getFriendlyReferences,
  normaliseFriendlyDistance,
} from "../utils/nineLineFriendlies.js";

export default function NineLineFriendliesField({
  brief,
  targets = [],
  attackTarget,
  updateBrief,
}) {
  const mode = brief.friendliesMode || "mapped";
  const references = useMemo(
    () => getFriendlyReferences(targets, attackTarget),
    [attackTarget, targets]
  );
  const selectedReference = references.find(
    (reference) => reference.id === brief.friendlyTargetId
  );

  useEffect(() => {
    if (mode !== "mapped") return;
    const reference = selectedReference || references[0];
    const nextId = reference?.id || "";
    const nextValue = reference?.value || "NO FRIENDLY UNITS PLOTTED";

    if (brief.friendlyTargetId !== nextId) updateBrief("friendlyTargetId", nextId);
    if (brief.friendlies !== nextValue) updateBrief("friendlies", nextValue);
  }, [brief.friendlies, brief.friendlyTargetId, mode, references, selectedReference, updateBrief]);

  function setMode(nextMode) {
    updateBrief("friendliesMode", nextMode);
    updateBrief(
      "friendlies",
      nextMode === "mapped"
        ? references[0]?.value || "NO FRIENDLY UNITS PLOTTED"
        : formatManualFriendly(
            brief.friendlyDirection || "SOUTH",
            brief.friendlyDistanceMetres || "800"
          )
    );
    if (nextMode === "mapped") {
      updateBrief("friendlyTargetId", references[0]?.id || "");
    }
  }

  function selectFriendly(id) {
    const reference = references.find((item) => item.id === id);
    updateBrief("friendlyTargetId", id);
    updateBrief("friendlies", reference?.value || "NO FRIENDLY UNITS PLOTTED");
  }

  function setManual(field, rawValue) {
    const value =
      field === "friendlyDistanceMetres"
        ? normaliseFriendlyDistance(rawValue)
        : rawValue;
    const direction =
      field === "friendlyDirection" ? value : brief.friendlyDirection || "SOUTH";
    const distance =
      field === "friendlyDistanceMetres"
        ? value
        : brief.friendlyDistanceMetres || "800";
    updateBrief(field, value);
    updateBrief("friendlies", formatManualFriendly(direction, distance));
  }

  return (
    <div className="nineLineFriendliesField">
      <label className="field">
        Line 8 friendlies
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="mapped">Closest friendly unit on map</option>
          <option value="manual">Manual distance / direction</option>
        </select>
      </label>

      {mode === "mapped" ? (
        <label className="field">
          Friendly unit
          <select
            value={selectedReference?.id || ""}
            onChange={(event) => selectFriendly(event.target.value)}
          >
            {!references.length && (
              <option value="">No friendly units plotted on map</option>
            )}
            {references.map((reference) => (
              <option key={reference.id} value={reference.id}>
                {reference.name} / {reference.direction} {reference.distanceMetres}M
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid compactGrid">
          <label className="field">
            Direction from target
            <select
              value={brief.friendlyDirection || "SOUTH"}
              onChange={(event) => setManual("friendlyDirection", event.target.value)}
            >
              {friendlyDirections.map((direction) => (
                <option key={direction}>{direction}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Distance (metres)
            <input
              type="number"
              min="0"
              max="99999"
              value={brief.friendlyDistanceMetres || "800"}
              onChange={(event) =>
                setManual("friendlyDistanceMetres", event.target.value)
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}
