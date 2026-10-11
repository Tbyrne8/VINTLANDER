import {
  cardinalHeadingOptions,
  formatCardinalHeading,
  formatDegreeHeading,
  normaliseHeadingDegrees,
  normaliseHeadingTolerance,
} from "../utils/nineLineHeading.js";

export default function NineLineHeadingField({ brief, updateBrief }) {
  const mode = brief.headingMode || "asRequired";

  function setMode(nextMode) {
    updateBrief("headingMode", nextMode);

    if (nextMode === "cardinal") {
      updateBrief(
        "heading",
        formatCardinalHeading(
          brief.headingCardinal || cardinalHeadingOptions[0],
          brief.headingCardinalTolerance || ""
        )
      );
    } else if (nextMode === "degrees") {
      updateBrief(
        "heading",
        formatDegreeHeading(
          brief.headingDegrees || "280",
          brief.headingTolerance || "30"
        )
      );
    } else {
      updateBrief("heading", "AS REQUIRED");
    }
  }

  function setCardinal(value) {
    updateBrief("headingCardinal", value);
    updateBrief(
      "heading",
      formatCardinalHeading(value, brief.headingCardinalTolerance || "")
    );
  }

  function setCardinalTolerance(rawValue) {
    const value = normaliseHeadingTolerance(rawValue);
    updateBrief("headingCardinalTolerance", value);
    updateBrief(
      "heading",
      formatCardinalHeading(
        brief.headingCardinal || cardinalHeadingOptions[0],
        value
      )
    );
  }

  function setDegrees(field, rawValue) {
    const value =
      field === "headingDegrees"
        ? normaliseHeadingDegrees(rawValue)
        : normaliseHeadingTolerance(rawValue);
    const heading = field === "headingDegrees" ? value : brief.headingDegrees || "280";
    const tolerance =
      field === "headingTolerance" ? value : brief.headingTolerance || "30";

    updateBrief(field, value);
    updateBrief("heading", formatDegreeHeading(heading, tolerance));
  }

  return (
    <div className="nineLineHeadingField">
      <label className="field">
        Line 2 heading
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="asRequired">As required</option>
          <option value="cardinal">Cardinal direction</option>
          <option value="degrees">Degrees plus or minus</option>
        </select>
      </label>

      {mode === "cardinal" && (
        <div className="grid compactGrid">
          <label className="field">
            Direction
            <select
              value={brief.headingCardinal || cardinalHeadingOptions[0]}
              onChange={(event) => setCardinal(event.target.value)}
            >
              {cardinalHeadingOptions.map((heading) => (
                <option key={heading}>{heading}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Optional plus or minus (degrees)
            <input
              type="number"
              min="0"
              max="180"
              value={brief.headingCardinalTolerance || ""}
              onChange={(event) => setCardinalTolerance(event.target.value)}
              placeholder="Example: 30"
            />
          </label>
        </div>
      )}

      {mode === "degrees" && (
        <div className="grid compactGrid">
          <label className="field">
            Heading (0–360°)
            <input
              type="number"
              min="0"
              max="360"
              value={brief.headingDegrees || "280"}
              onChange={(event) => setDegrees("headingDegrees", event.target.value)}
            />
          </label>
          <label className="field">
            Plus or minus (degrees)
            <input
              type="number"
              min="0"
              max="180"
              value={brief.headingTolerance || "30"}
              onChange={(event) => setDegrees("headingTolerance", event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
