import { useState } from "react";
import * as mgrs from "mgrs";
import { parseMgrs } from "../utils/mgrs.js";
import { friendlyUnitTypes } from "../utils/friendlyUnitTypes.js";
import { enemyUnitTypes } from "../utils/enemyUnitTypes.js";

export default function TargetRegister({
  targets,
  setTargets,
  position,
  setPosition,
  setMapResetKey,
  allowedTargetTypes = ["enemy", "friendly", "neutral", "unknown", "objective"],
  title = "TARGET REGISTER",
}) {
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState(allowedTargetTypes[0] || "enemy");
  const [friendlyUnitType, setFriendlyUnitType] = useState("infantry");
  const [enemyUnitType, setEnemyUnitType] = useState("infantry");
  const [targetGrid, setTargetGrid] = useState("");

  const nextTargetNumber = targets.length + 1;
  const nextTargetId = `TGT-${String(nextTargetNumber).padStart(3, "0")}`;
  const visibleTargets = targets.filter((target) =>
    allowedTargetTypes.includes(target.type)
  );

  function saveTargetAtPosition(targetPosition) {
    if (!description.trim()) {
      alert("Add a target description first.");
      return false;
    }

    const newTarget = {
      id: nextTargetId,
      description: description.trim(),
      type: targetType,
      ...(targetType === "friendly" ? { unitType: friendlyUnitType } : {}),
      ...(targetType === "enemy" ? { unitType: enemyUnitType } : {}),
      position: targetPosition,
      mgrs: mgrs.forward([targetPosition.lng, targetPosition.lat]),
      createdAt: new Date().toLocaleTimeString(),
    };

    setTargets([...targets, newTarget]);
    setDescription("");
    setTargetType(allowedTargetTypes[0] || "enemy");
    return true;
  }

  function saveTargetAtGrid() {
    try {
      const targetPosition = parseMgrs(targetGrid);
      if (!saveTargetAtPosition(targetPosition)) return;
      setTargetGrid("");
      setPosition(targetPosition);
      setMapResetKey((current) => current + 1);
    } catch {
      alert("Invalid target MGRS grid.");
    }
  }

  function goToTarget(target) {
    setPosition(target.position);
    setMapResetKey((current) => current + 1);
  }

  return (
    <div className="targetRegister">
      <h2>{title}</h2>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Target description"
      />

      {allowedTargetTypes.length > 1 && (
        <select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
          {allowedTargetTypes.includes("enemy") && <option value="enemy">Enemy</option>}
          {allowedTargetTypes.includes("friendly") && <option value="friendly">Friendly</option>}
          {allowedTargetTypes.includes("neutral") && <option value="neutral">Neutral</option>}
          {allowedTargetTypes.includes("unknown") && <option value="unknown">Unknown</option>}
          {allowedTargetTypes.includes("objective") && <option value="objective">Objective</option>}
        </select>
      )}

      {targetType === "friendly" && (
        <label className="field">
          Friendly unit type
          <select
            value={friendlyUnitType}
            onChange={(event) => setFriendlyUnitType(event.target.value)}
          >
            {friendlyUnitTypes.map((unitType) => (
              <option key={unitType.value} value={unitType.value}>
                {unitType.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {targetType === "enemy" && (
        <label className="field">
          Enemy unit type
          <select
            value={enemyUnitType}
            onChange={(event) => setEnemyUnitType(event.target.value)}
          >
            {enemyUnitTypes.map((unitType) => (
              <option key={unitType.value} value={unitType.value}>
                {unitType.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <button onClick={() => saveTargetAtPosition(position)}>
        Plot Target At Crosshair
      </button>

      <label className="field">
        Target MGRS grid
        <input
          value={targetGrid}
          onChange={(event) => setTargetGrid(event.target.value.toUpperCase())}
          placeholder="Example: 30U WB 68569 74674"
        />
      </label>
      <button onClick={saveTargetAtGrid}>Plot Target From Grid</button>

      {visibleTargets.length === 0 && (
        <p className="emptyText">No saved positions of this type yet.</p>
      )}

      {visibleTargets.map((target) => (
        <div key={target.id} className={`targetItem ${target.type}`}>
          <button onClick={() => goToTarget(target)}>
            <strong>{target.id}</strong>
            <span>{target.description}</span>
            <small>
              {target.type.toUpperCase()} - {target.mgrs}
            </small>
          </button>

          <button
            className="removeTarget"
            onClick={() =>
              setTargets(targets.filter((item) => item.id !== target.id))
            }
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
