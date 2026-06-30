import { Polyline } from "@vis.gl/react-google-maps";

export default function ObserverLine({ observerPosition, position, showLine }) {
  if (!observerPosition || !showLine) return null;

  return (
    <Polyline
      path={[observerPosition, position]}
      strokeColor="#00ff66"
      strokeOpacity={0.9}
      strokeWeight={2}
    />
  );
}