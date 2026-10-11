import { Marker } from "@vis.gl/react-google-maps";
import observationPostIcon from "../assets/op-observation-post.png";

function makeObserverIcon() {
  return {
    url: observationPostIcon,
    scaledSize: { width: 48, height: 30 },
    anchor: { x: 24, y: 15 },
  };
}

export default function ObserverMarker({ observerPosition }) {
  if (!observerPosition) return null;

  return <Marker position={observerPosition} icon={makeObserverIcon()} />;
}
