import {
  formatNauticalMiles,
  normaliseNauticalMiles,
} from "../utils/nineLineDistance.js";

export default function NineLineDistanceField({ brief, updateBrief }) {
  function setDistance(rawValue) {
    const value = normaliseNauticalMiles(rawValue);
    updateBrief("distanceNm", value);
    updateBrief("distance", formatNauticalMiles(value));
  }

  return (
    <label className="field">
      Line 3 distance (nautical miles)
      <input
        type="number"
        min="0"
        max="999"
        step="0.1"
        value={brief.distanceNm || "4"}
        onChange={(event) => setDistance(event.target.value)}
        placeholder="Example: 4"
      />
    </label>
  );
}
