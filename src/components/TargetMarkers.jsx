import { Marker } from "@vis.gl/react-google-maps";
import { getFriendlyUnitLabel } from "../utils/friendlyUnitTypes.js";
import { getEnemyUnitLabel } from "../utils/enemyUnitTypes.js";

const iconStyles = {
  enemy: { colour: "#ff3333", label: "ENY" },
  friendly: { colour: "#3399ff", label: "FRD" },
  neutral: { colour: "#33cc66", label: "NEU" },
  unknown: { colour: "#ffcc33", label: "UNK" },
  objective: { colour: "#aa33ff", label: "OBJ" },
};

const friendlySymbols = {
  infantry: '<path d="M22 17l28 20M50 17L22 37"/>',
  armour: '<ellipse cx="36" cy="27" rx="14" ry="8"/>',
  artillery: '<circle cx="36" cy="27" r="7" fill="#1683ff" stroke="none"/>',
  reconnaissance: '<path d="M20 38L52 16"/>',
  "air-defence": '<path d="M22 34L36 19L50 34"/>',
  tacp: '<text x="36" y="31" font-size="11" font-weight="800" text-anchor="middle" font-family="Arial">TACP</text>',
};

const enemySymbols = {
  infantry: '<path d="M27 20l18 18M45 20L27 38"/>',
  "mechanized-infantry": '<path d="M27 20l18 18M45 20L27 38"/><ellipse cx="36" cy="29" rx="13" ry="7"/>',
  armour: '<ellipse cx="36" cy="29" rx="14" ry="8"/>',
  artillery: '<circle cx="36" cy="29" r="7" fill="#e1262f" stroke="none"/>',
  reconnaissance: '<path d="M25 38L47 20"/>',
  "air-defence": '<path d="M25 35Q36 20 47 35"/>',
  engineer: '<path d="M25 35V25h22v10M31 35V25M41 35V25"/>',
  "special-forces": '<text x="36" y="33" font-size="11" font-weight="800" text-anchor="middle" font-family="Arial">SF</text>',
};

function makeFriendlyIcon(unitType = "infantry") {
  const symbol = friendlySymbols[unitType] || friendlySymbols.infantry;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="76" height="58" viewBox="0 0 76 58">
      <rect x="10" y="10" width="52" height="34" fill="#eaf4ff" fill-opacity="0.95" stroke="#1683ff" stroke-width="3"/>
      <g fill="none" stroke="#1683ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${symbol}</g>
      <text x="36" y="56" font-size="9" fill="#1683ff" text-anchor="middle" font-family="Arial" font-weight="700">FRIENDLY</text>
    </svg>
  `;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 36, y: 27 },
  };
}

function makeEnemyIcon(unitType = "infantry") {
  const symbol = enemySymbols[unitType] || enemySymbols.infantry;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="76" height="64" viewBox="0 0 76 64">
      <path d="M36 8L60 29L36 50L12 29Z" fill="#fff0f1" fill-opacity="0.96" stroke="#e1262f" stroke-width="3"/>
      <g fill="none" stroke="#e1262f" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${symbol}</g>
      <text x="36" y="63" font-size="9" fill="#e1262f" text-anchor="middle" font-family="Arial" font-weight="700">ENEMY</text>
    </svg>
  `;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 36, y: 29 },
  };
}

function makeIcon(type, unitType) {
  if (type === "friendly") return makeFriendlyIcon(unitType);
  if (type === "enemy") return makeEnemyIcon(unitType);
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
          icon={makeIcon(target.type, target.unitType)}
          title={
            target.type === "friendly"
              ? `${target.description || target.id} — ${getFriendlyUnitLabel(target.unitType)}`
              : target.type === "enemy"
                ? `${target.description || target.id} — ${getEnemyUnitLabel(target.unitType)}`
              : target.description || target.id
          }
        />
      ))}
    </>
  );
}
