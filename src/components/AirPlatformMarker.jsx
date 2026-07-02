import { Marker } from "@vis.gl/react-google-maps";

function makeAirPlatformIcon(platform) {
  const label = (platform.callsign || "AIR").slice(0, 7).toUpperCase();
  const aircraftType = getAircraftType(platform.aircraft);
  const silhouette = getAircraftSilhouette(aircraftType);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="112" height="76" viewBox="0 0 112 76">
      <path d="M56 4 L63 13 L56 22 L49 13 Z" fill="${silhouette.colour}" fill-opacity="0.92"/>
      ${silhouette.markup}
      <circle cx="56" cy="36" r="3" fill="#00ff66"/>
      <line x1="56" y1="16" x2="56" y2="62" stroke="${silhouette.colour}" stroke-width="1" stroke-opacity="0.45" stroke-dasharray="3 4"/>
      <line x1="26" y1="36" x2="86" y2="36" stroke="${silhouette.colour}" stroke-width="1" stroke-opacity="0.45" stroke-dasharray="3 4"/>
      <rect x="22" y="60" width="68" height="14" rx="2" fill="#061208" fill-opacity="0.88" stroke="${silhouette.colour}" stroke-width="1"/>
      <text x="56" y="70" font-size="8.5" fill="white" text-anchor="middle" font-family="Arial" font-weight="800">${label}</text>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 56, y: 36 },
  };
}

function getAircraftType(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (normalisedAircraft.includes("MQ-9") || normalisedAircraft.includes("REAPER")) {
    return "uav";
  }

  if (normalisedAircraft.includes("APACHE") || normalisedAircraft.includes("HELI")) {
    return "helicopter";
  }

  return "fastJet";
}

function getAircraftSilhouette(type) {
  const silhouettes = {
    uav: {
      colour: "#00ff66",
      markup: `
        <path d="M54 17 L58 17 L61 34 L100 37 L100 40 L61 41 L59 51 L73 57 L73 60 L56 55 L39 60 L39 57 L53 51 L51 41 L12 40 L12 37 L51 34 Z" fill="#dfffdc" stroke="#061208" stroke-width="1.1"/>
      `,
    },
    helicopter: {
      colour: "#f5c542",
      markup: `
        <ellipse cx="56" cy="29" rx="40" ry="5" fill="none" stroke="#f5c542" stroke-width="2.2" stroke-opacity="0.85"/>
        <line x1="56" y1="15" x2="56" y2="43" stroke="#f5c542" stroke-width="2" stroke-linecap="round"/>
        <path d="M40 38 C40 30 47 27 56 27 C65 27 72 30 72 38 L69 49 C68 54 63 57 56 57 C49 57 44 54 43 49 Z" fill="#dfffdc" stroke="#061208" stroke-width="1.3"/>
        <path d="M56 55 L56 66 M46 66 L66 66" stroke="#dfffdc" stroke-width="3" stroke-linecap="round"/>
        <path d="M72 42 L91 48 L91 52 L71 49" fill="#dfffdc" stroke="#061208" stroke-width="1.1"/>
      `,
    },
    fastJet: {
      colour: "#7ec8ff",
      markup: `
        <path d="M56 9 L66 41 L102 58 L102 63 L61 53 L56 64 L51 53 L10 63 L10 58 L46 41 Z" fill="#dfffdc" stroke="#061208" stroke-width="1.2"/>
        <path d="M49 39 L56 18 L63 39 Z" fill="#7ec8ff" fill-opacity="0.88"/>
        <path d="M51 52 L56 45 L61 52 L56 59 Z" fill="#061208" fill-opacity="0.45"/>
      `,
    },
  };

  return silhouettes[type] || silhouettes.fastJet;
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
