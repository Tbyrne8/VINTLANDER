import { Marker } from "@vis.gl/react-google-maps";

const iconStyles = {
  enemy: { colour: "#ff3333", label: "ENY" },
  friendly: { colour: "#3399ff", label: "FRD" },
  neutral: { colour: "#33cc66", label: "NEU" },
  unknown: { colour: "#ffcc33", label: "UNK" },
  objective: { colour: "#aa33ff", label: "OBJ" },
};

function makeIcon(type) {
  const style = iconStyles[type] || iconStyles.unknown;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="56" viewBox="0 0 72 56">
      <rect x="12" y="12" width="48" height="28" fill="${style.colour}" fill-opacity="0.85" stroke="white" stroke-width="2"/>
      <line x1="12" y1="12" x2="60" y2="40" stroke="white" stroke-width="2"/>
      <line x1="60" y1="12" x2="12" y2="40" stroke="white" stroke-width="2"/>
      <text x="36" y="52" font-size="10" fill="white" text-anchor="middle" font-family="Arial">${style.label}</text>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 36, y: 28 },
  };
}

export default function TargetMarkers({ targets }) {
  return (
    <>
      {targets.map((target) => (
        <Marker
          key={target.id}
          position={target.position}
          icon={makeIcon(target.type)}
        />
      ))}
    </>
  );
}