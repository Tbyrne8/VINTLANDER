import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export default function PendingRouteLine({ from, to }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !window.google || !from || !to) return undefined;

    const line = new window.google.maps.Polyline({
      path: [from, to],
      geodesic: true,
      strokeColor: "#8fd8ff",
      strokeOpacity: 0,
      strokeWeight: 2,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 0.95,
            strokeWeight: 2,
            scale: 3,
          },
          offset: "0",
          repeat: "18px",
        },
      ],
      clickable: false,
      zIndex: 4,
    });

    line.setMap(map);

    return () => line.setMap(null);
  }, [from, map, to]);

  return null;
}
