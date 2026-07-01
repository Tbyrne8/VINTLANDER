import { Marker } from "@vis.gl/react-google-maps";

function makeAirPlatformIcon(platform) {
  const label = (platform.callsign || "AIR").slice(0, 7).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="92" height="68" viewBox="0 0 92 68">
      <circle cx="34" cy="30" r="23" fill="#071108" fill-opacity="0.84" stroke="#f5c542" stroke-width="2"/>
      <path d="M34 8 L43 34 L34 29 L25 34 Z" fill="#f5c542" stroke="white" stroke-width="1.4"/>
      <circle cx="34" cy="30" r="5" fill="#00ff66" fill-opacity="0.85"/>
      <rect x="6" y="48" width="56" height="16" rx="3" fill="#071108" fill-opacity="0.88" stroke="#f5c542"/>
      <text x="34" y="60" font-size="9" fill="white" text-anchor="middle" font-family="Arial" font-weight="700">${label}</text>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 34, y: 30 },
  };
}

export default function AirPlatformMarker({ platform }) {
  if (!platform?.position) return null;

  const title = [
    platform.callsign,
    platform.aircraft,
    platform.altitude,
    platform.mode,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <Marker
      position={platform.position}
      icon={makeAirPlatformIcon(platform)}
      title={title}
    />
  );
}
