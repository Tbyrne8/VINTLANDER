import { useEffect } from "react";
import { Marker, useMap } from "@vis.gl/react-google-maps";

const controlPointStyle = {
  ip: {
    label: "IP",
    colour: "#8fd8ff",
    sizeMetres: 1000,
    fillOpacity: 0.1,
  },
  bp: {
    label: "BP",
    colour: "#d6a5ff",
    sizeMetres: 2000,
    fillOpacity: 0.14,
  },
};

const controlPointColourSignature = Object.values(controlPointStyle)
  .map((style) => `${style.label}:${style.colour}:${style.fillOpacity}`)
  .join("|");

function makeControlPointIcon(point) {
  const style = controlPointStyle[point.type] || controlPointStyle.ip;
  const rawName = String(point.name || "").trim();
  const hasDesignation = rawName
    .toUpperCase()
    .startsWith(`${style.label} `);
  const label = escapeSvgText(
    `${hasDesignation ? "" : `${style.label} `}${rawName || style.label}`.toUpperCase()
  );

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="24" viewBox="0 0 128 24">
      <text x="6" y="15.5" font-size="10" fill="${style.colour}" font-family="Arial" font-weight="800">${label}</text>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    anchor: { x: 0, y: 24 },
  };
}

export default function ControlPointMarkers({ controlPoints = [] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return undefined;

    const polygons = controlPoints.map((point) => {
      const style = controlPointStyle[point.type] || controlPointStyle.ip;
      const polygon = new window.google.maps.Polygon({
        paths: makeSquarePath(point.position, style.sizeMetres),
        strokeColor: style.colour,
        strokeOpacity: 1,
        strokeWeight: point.type === "bp" ? 3 : 2.5,
        fillColor: style.colour,
        fillOpacity: style.fillOpacity,
        clickable: false,
        zIndex: point.type === "bp" ? 2 : 3,
      });

      polygon.setMap(map);
      return polygon;
    });

    return () => {
      polygons.forEach((polygon) => polygon.setMap(null));
    };
  }, [controlPoints, map, controlPointColourSignature]);

  return (
    <>
      {controlPoints.map((point) => (
        <Marker
          key={point.id}
          position={getLabelPosition(point)}
          icon={makeControlPointIcon(point)}
          title={`${point.type.toUpperCase()} ${point.name}`}
        />
      ))}
    </>
  );
}

function getLabelPosition(point) {
  const style = controlPointStyle[point.type] || controlPointStyle.ip;
  const half = style.sizeMetres / 2;

  return offsetPosition(point.position, -half, half);
}

function makeSquarePath(center, sizeMetres) {
  const half = sizeMetres / 2;

  return [
    offsetPosition(center, -half, half),
    offsetPosition(center, half, half),
    offsetPosition(center, half, -half),
    offsetPosition(center, -half, -half),
  ];
}

function offsetPosition(center, eastMetres, northMetres) {
  const metresPerDegreeLat = 111320;
  const metresPerDegreeLng =
    111320 * Math.cos((center.lat * Math.PI) / 180);

  return {
    lat: center.lat + northMetres / metresPerDegreeLat,
    lng: center.lng + eastMetres / metresPerDegreeLng,
  };
}

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
