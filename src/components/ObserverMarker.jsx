import { Marker } from "@vis.gl/react-google-maps";

function makeObserverIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r="20" fill="#6da544" fill-opacity="0.92" stroke="white" stroke-width="2"/>
      <circle cx="35" cy="35" r="7" fill="none" stroke="black" stroke-width="3"/>
      <line x1="35" y1="13" x2="35" y2="25" stroke="black" stroke-width="3"/>
      <line x1="35" y1="45" x2="35" y2="57" stroke="black" stroke-width="3"/>
      <line x1="13" y1="35" x2="25" y2="35" stroke="black" stroke-width="3"/>
      <line x1="45" y1="35" x2="57" y2="35" stroke="black" stroke-width="3"/>
      <rect x="22" y="2" width="26" height="18" rx="4" fill="#6da544" stroke="white" stroke-width="2"/>
      <text x="35" y="15" font-size="12" fill="white" text-anchor="middle" font-family="Arial" font-weight="bold">OP</text>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 35, y: 35 },
  };
}

export default function ObserverMarker({ observerPosition }) {
  if (!observerPosition) return null;

  return (
    <Marker
      position={observerPosition}
      icon={makeObserverIcon()}
    />
  );
}