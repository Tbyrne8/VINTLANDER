import { Marker } from "@vis.gl/react-google-maps";

function makeAirPlatformIcon(platform) {
  const label = (platform.callsign || "AIR").slice(0, 7).toUpperCase();
  const aircraftType = getAircraftType(platform.aircraft);
  const silhouette = getAircraftSilhouette(aircraftType);
  const altitude = (platform.altitude || platform.positionAltitude || "")
    .replace(/HOLDING|ROUTING TO|ESTABLISHED IN/gi, "")
    .split(",")
    .pop()
    ?.trim()
    .slice(0, 9);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="118" height="88" viewBox="0 0 118 88">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.85"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path d="M59 4 L64 12 L59 20 L54 12 Z" fill="${silhouette.colour}" fill-opacity="0.95"/>
        <circle cx="59" cy="39" r="27" fill="#061208" fill-opacity="0.56" stroke="${silhouette.colour}" stroke-width="0.9" stroke-opacity="0.28" stroke-dasharray="3 4"/>
        <line x1="59" y1="14" x2="59" y2="64" stroke="${silhouette.colour}" stroke-width="0.8" stroke-opacity="0.32"/>
        <line x1="33" y1="39" x2="85" y2="39" stroke="${silhouette.colour}" stroke-width="0.8" stroke-opacity="0.32"/>
        ${silhouette.markup}
        <circle cx="59" cy="39" r="2.4" fill="${silhouette.colour}"/>
        <rect x="25" y="68" width="68" height="15" rx="1.5" fill="#031006" fill-opacity="0.92" stroke="${silhouette.colour}" stroke-width="0.9"/>
        <text x="30" y="78" font-size="8.5" fill="#f7fff6" font-family="Arial" font-weight="800">${label}</text>
        ${altitude ? `<text x="88" y="78" font-size="6.5" fill="${silhouette.colour}" text-anchor="end" font-family="Arial" font-weight="700">${altitude}</text>` : ""}
      </g>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 59, y: 39 },
  };
}

function getAircraftType(aircraft = "") {
  const normalisedAircraft = aircraft.toUpperCase();

  if (
    ["MQ-9", "REAPER", "UAV", "RPAS"].some((term) =>
      normalisedAircraft.includes(term)
    )
  ) {
    return "mq9";
  }

  if (normalisedAircraft.includes("WATCHKEEPER")) {
    return "watchkeeper";
  }

  if (
    ["APACHE", "AH-64", "TIGER", "AH-1", "COBRA", "HELI"].some((term) =>
      normalisedAircraft.includes(term)
    )
  ) {
    return "helicopter";
  }

  if (normalisedAircraft.includes("A-10")) {
    return "a10";
  }

  if (normalisedAircraft.includes("AC-130")) {
    return "gunship";
  }

  return "fastJet";
}

function getAircraftSilhouette(type) {
  const silhouettes = {
    mq9: {
      colour: "#00ff66",
      markup: `
        <path d="M56 16 C57 11 61 11 62 16 L64 34 L111 39 L111 42 L64 44 L62 56 L78 67 L76 70 L59 62 L42 70 L40 67 L56 56 L54 44 L7 42 L7 39 L54 34 Z" fill="#dce8df" stroke="#001f0c" stroke-width="1.05"/>
        <path d="M47 35 L71 35 L71 43 L47 43 Z" fill="#1f2f27" fill-opacity="0.34"/>
        <circle cx="54" cy="23" r="2.1" fill="#061208" fill-opacity="0.78"/>
        <path d="M61 58 L75 66 M57 58 L43 66" stroke="#00ff66" stroke-width="1" stroke-opacity="0.45"/>
      `,
    },
    watchkeeper: {
      colour: "#00ff66",
      markup: `
        <path d="M57 18 C58 13 60 13 61 18 L63 35 L103 39 L103 42 L63 44 L62 55 L72 65 L70 68 L59 61 L48 68 L46 65 L56 55 L55 44 L15 42 L15 39 L55 35 Z" fill="#dce8df" stroke="#001f0c" stroke-width="1.05"/>
        <path d="M50 36 L68 36 L68 43 L50 43 Z" fill="#1f2f27" fill-opacity="0.34"/>
      `,
    },
    helicopter: {
      colour: "#f5c542",
      markup: `
        <ellipse cx="59" cy="28" rx="42" ry="4.2" fill="none" stroke="#f5c542" stroke-width="1.7" stroke-opacity="0.72"/>
        <line x1="59" y1="14" x2="59" y2="43" stroke="#f5c542" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M45 41 C45 31 51 28 59 28 C67 28 73 31 73 41 L70 53 C69 59 65 62 59 62 C53 62 49 59 48 53 Z" fill="#dce8df" stroke="#001f0c" stroke-width="1.05"/>
        <path d="M59 60 L59 72 M47 72 L71 72" stroke="#dce8df" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M72 45 L98 51 L98 55 L71 52" fill="#dce8df" stroke="#001f0c" stroke-width="1.05"/>
        <path d="M43 47 L34 50 M75 47 L84 50" stroke="#f5c542" stroke-width="1.1" stroke-opacity="0.65"/>
      `,
    },
    a10: {
      colour: "#7ec8ff",
      markup: `
        <path d="M58 13 L64 40 L107 58 L107 62 L65 54 L60 69 L58 69 L53 54 L11 62 L11 58 L54 40 Z" fill="#dce8df" stroke="#001f0c" stroke-width="1.05"/>
        <path d="M45 36 L73 36 L75 45 L43 45 Z" fill="#1f2f27" fill-opacity="0.32"/>
        <circle cx="50" cy="47" r="3.5" fill="#dce8df" stroke="#001f0c" stroke-width="0.9"/>
        <circle cx="68" cy="47" r="3.5" fill="#dce8df" stroke="#001f0c" stroke-width="0.9"/>
        <path d="M55 66 L59 57 L63 66" fill="#7ec8ff" fill-opacity="0.72"/>
      `,
    },
    gunship: {
      colour: "#b7f0ff",
      markup: `
        <path d="M54 13 L64 13 L68 36 L105 43 L105 48 L69 47 L67 62 L78 70 L75 74 L60 67 L43 74 L40 70 L51 62 L49 47 L13 48 L13 43 L50 36 Z" fill="#dce8df" stroke="#001f0c" stroke-width="1.05"/>
        <path d="M47 32 L71 32 L73 52 L45 52 Z" fill="#1f2f27" fill-opacity="0.3"/>
        <circle cx="39" cy="46" r="2.2" fill="#061208" fill-opacity="0.65"/>
        <circle cx="79" cy="46" r="2.2" fill="#061208" fill-opacity="0.65"/>
      `,
    },
    fastJet: {
      colour: "#7ec8ff",
      markup: `
        <path d="M59 10 L67 40 L108 59 L108 64 L64 55 L59 69 L54 55 L10 64 L10 59 L51 40 Z" fill="#dce8df" stroke="#001f0c" stroke-width="1.05"/>
        <path d="M51 39 L59 18 L67 39 Z" fill="#7ec8ff" fill-opacity="0.78"/>
        <path d="M54 55 L59 48 L64 55 L59 64 Z" fill="#061208" fill-opacity="0.36"/>
        <path d="M48 43 L70 43" stroke="#001f0c" stroke-width="0.8" stroke-opacity="0.5"/>
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
