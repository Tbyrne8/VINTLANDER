import { useState } from "react";
import * as mgrs from "mgrs";
import { friendlyUnitTypes } from "../utils/friendlyUnitTypes.js";
import { enemyUnitTypes } from "../utils/enemyUnitTypes.js";

export default function TargetRegister({
  targets,
  setTargets,
  position,
  setPosition,
  setMapResetKey,
}) {
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState("enemy");
  const [friendlyUnitType, setFriendlyUnitType] = useState("infantry");
  const [enemyUnitType, setEnemyUnitType] = useState("infantry");

  const nextTargetNumber = targets.length + 1;
  const nextTargetId = `TGT-${String(nextTargetNumber).padStart(3, "0")}`;

  function saveTarget() {
    if (!description.trim()) {
      alert("Add a target description first.");
      return;
    }

    const newTarget = {
      id: nextTargetId,
      description: description.trim(),
      type: targetType,
      ...(targetType === "friendly" ? { unitType: friendlyUnitType } : {}),
      ...(targetType === "enemy" ? { unitType: enemyUnitType } : {}),
      position,
      mgrs: mgrs.forward([position.lng, position.lat]),
      createdAt: new Date().toLocaleTimeString(),
    };

    setTargets([...targets, newTarget]);
    setDescription("");
    setTargetType("enemy");
  }

  function goToTarget(target) {
    setPosition(target.position);
    setMapResetKey((current) => current + 1);
  }

  return (
    <div className="targetRegister">
      <h2>TARGET REGISTER</h2>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Target description"
      />

      <select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
        <option value="enemy">Enemy</option>
        <option value="friendly">Friendly</option>
        <option value="neutral">Neutral</option>
        <option value="unknown">Unknown</option>
        <option value="objective">Objective</option>
      </select>

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

      <button onClick={saveTarget}>Save Current Target</button>

      {targets.length === 0 && <p className="emptyText">No saved targets yet.</p>}

      {targets.map((target) => (
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
