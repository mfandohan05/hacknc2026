import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

type Props = {
  onMapClick?: () => void;
  target?: { lng: number; lat: number } | null;
};

export default function InteractiveMap({ onMapClick, target }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-74.5, 40],
      zoom: 9,
      attributionControl: false,
      logoPosition: "bottom-right",
    });

    mapRef.current = map;

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
      fitBoundsOptions: { maxZoom: 14 },
    });

    map.on("click", () => onMapClickRef.current?.());
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => geolocate.trigger());

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !target) return;
    markerRef.current?.remove();
    markerRef.current = new mapboxgl.Marker({ color: "#208A5D" })
      .setLngLat([target.lng, target.lat])
      .addTo(map);
    map.flyTo({ center: [target.lng, target.lat], zoom: 15 });
  }, [target]);

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="absolute inset-0 h-full w-full" />
    </div>
  );
}