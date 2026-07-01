import { Marker } from "@vis.gl/react-google-maps";

function makeAirPlatformIcon(platform) {
  const label = (platform.callsign || "AIR").slice(0, 7).toUpperCase();
  const aircraftType = getAircraftType(platform.aircraft);
  const silhouette = getAircraftSilhouette(aircraftType);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="104" height="82" viewBox="0 0 104 82">
      <circle cx="52" cy="34" r="27" fill="#071108" fill-opacity="0.78" stroke="${silhouette.colour}" stroke-width="2"/>
      ${silhouette.markup}
      <circle cx="52" cy="34" r="4" fill="#00ff66" fill-opacity="0.9"/>
      <rect x="20" y="62" width="64" height="16" rx="3" fill="#071108" fill-opacity="0.9" stroke="${silhouette.colour}"/>
      <text x="52" y="74" font-size="9" fill="white" text-anchor="middle" font-family="Arial" font-weight="700">${label}</text>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 52, y: 34 },
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
        <path d="M50 12 L54 12 L57 32 L91 36 L91 40 L57 39 L55 53 L67 58 L67 62 L52 58 L37 62 L37 58 L49 53 L47 39 L13 40 L13 36 L47 32 Z" fill="#dfffdc" stroke="#071108" stroke-width="1.2"/>
      `,
    },
    helicopter: {
      colour: "#f5c542",
      markup: `
        <line x1="17" y1="24" x2="87" y2="24" stroke="#f5c542" stroke-width="4" stroke-linecap="round"/>
        <line x1="52" y1="8" x2="52" y2="40" stroke="#f5c542" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
        <circle cx="52" cy="24" r="5" fill="#dfffdc" stroke="#071108" stroke-width="1.2"/>
        <path d="M39 33 C39 26 44 22 52 22 C60 22 65 26 65 33 L62 49 C61 54 57 57 52 57 C47 57 43 54 42 49 Z" fill="#dfffdc" stroke="#071108" stroke-width="1.4"/>
        <path d="M52 56 L52 68" stroke="#dfffdc" stroke-width="5" stroke-linecap="round"/>
        <path d="M44 66 L60 66" stroke="#f5c542" stroke-width="3" stroke-linecap="round"/>
        <path d="M42 42 L32 48 M62 42 L72 48" stroke="#dfffdc" stroke-width="3" stroke-linecap="round"/>
      `,
    },
    fastJet: {
      colour: "#7ec8ff",
      markup: `
        <path d="M52 8 L61 39 L91 54 L91 60 L57 52 L52 62 L47 52 L13 60 L13 54 L43 39 Z" fill="#dfffdc" stroke="#071108" stroke-width="1.3"/>
        <path d="M45 37 L52 17 L59 37 Z" fill="#7ec8ff" fill-opacity="0.9"/>
        <path d="M47 52 L52 45 L57 52 L52 58 Z" fill="#071108" fill-opacity="0.5"/>
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
