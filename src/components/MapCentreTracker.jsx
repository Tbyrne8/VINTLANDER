import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";

export default function MapCentreTracker({ setPosition }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener("idle", () => {
      const centre = map.getCenter();

      if (!centre) return;

      setPosition({
        lat: centre.lat(),
        lng: centre.lng(),
      });
    });

    return () => {
      if (listener?.remove) {
        listener.remove();
      }
    };
  }, [map, setPosition]);

  return null;
}
