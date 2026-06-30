import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export default function ObserverLine({ observerPosition, position, showLine }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !observerPosition || !showLine || !window.google?.maps) {
      return undefined;
    }

    const line = new window.google.maps.Polyline({
      path: [observerPosition, position],
      strokeColor: "#00ff66",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      map,
    });

    return () => line.setMap(null);
  }, [map, observerPosition, position, showLine]);

  return null;
}
