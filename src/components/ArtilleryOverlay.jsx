import { useEffect } from "react";
import { Marker, useMap } from "@vis.gl/react-google-maps";

function artilleryIcon(label, colour = "#ffb020") {
  const safeLabel = String(label || "GUNS")
    .toUpperCase()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="42" viewBox="0 0 140 42"><circle cx="16" cy="18" r="11" fill="#111827" stroke="${colour}" stroke-width="3"/><path d="M8 18h16M16 10v16" stroke="${colour}" stroke-width="2"/><text x="32" y="22" fill="${colour}" font-family="Arial" font-size="11" font-weight="800">${safeLabel}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: { x: 16, y: 18 },
  };
}

export default function ArtilleryOverlay({ artillery = [] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google) return undefined;
    const lines = artillery
      .filter((item) => item.gunPosition && item.targetPosition)
      .map((item) => {
        const line = new window.google.maps.Polyline({
          path: [item.gunPosition, item.targetPosition],
          geodesic: true,
          strokeColor: "#ff6b35",
          strokeOpacity: 0.9,
          strokeWeight: 3,
          icons: [{
            icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
            offset: "92%",
          }],
          clickable: false,
          zIndex: 5,
        });
        line.setMap(map);
        return line;
      });

    return () => lines.forEach((line) => line.setMap(null));
  }, [artillery, map]);

  return (
    <>
      {artillery.map((item) => (
        <Marker
          key={`${item.id}-guns`}
          position={item.gunPosition}
          icon={artilleryIcon(item.name || "GUNS")}
          title={`${item.name || "Artillery"} gun position`}
        />
      ))}
      {artillery.filter((item) => item.targetPosition).map((item) => (
        <Marker
          key={`${item.id}-target`}
          position={item.targetPosition}
          icon={artilleryIcon(`${item.name || "GUNS"} TARGET`, "#ff6b35")}
          title={`${item.name || "Artillery"} gun-target line target`}
        />
      ))}
    </>
  );
}
