import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { RouteOption } from "@/types/route";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

type Props = {
  onMapClick?: () => void;
  target?: { lng: number; lat: number } | null;
  routes?: RouteOption[];
  selectedRouteId?: string | null;
};

const ROUTES_SOURCE = "routes";
const ROUTES_LAYER = "routes-line";
// keep the fitted route clear of the top bar and the bottom sheet
const FIT_PADDING = { top: 140, bottom: 380, left: 40, right: 40 };

export default function InteractiveMap({ onMapClick, target, routes = [], selectedRouteId = null }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const loadedRef = useRef(false);
  const routesRef = useRef({ routes, selectedRouteId });

  const drawRoutes = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const { routes, selectedRouteId } = routesRef.current;
    // selected route last so it renders on top
    const ordered = [...routes].sort(
      (a, b) => Number(a.routeId === selectedRouteId) - Number(b.routeId === selectedRouteId),
    );
    const data: Parameters<mapboxgl.GeoJSONSource["setData"]>[0] = {
      type: "FeatureCollection",
      features: ordered.map((r) => ({
        type: "Feature",
        properties: { selected: r.routeId === selectedRouteId },
        geometry: { type: "LineString", coordinates: r.geometry },
      })),
    };
    const source = map.getSource(ROUTES_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }
    map.addSource(ROUTES_SOURCE, { type: "geojson", data });
    map.addLayer({
      id: ROUTES_LAYER,
      type: "line",
      source: ROUTES_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["case", ["get", "selected"], "#208A5D", "#17334A"],
        "line-opacity": ["case", ["get", "selected"], 0.95, 0.35],
        "line-width": ["case", ["get", "selected"], 7, 4],
      },
    });
  };

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
    map.addControl(geolocate, "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      loadedRef.current = true;
      drawRoutes();
      geolocate.trigger();
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.remove();
    markerRef.current = null;
    if (!target) return;
    markerRef.current = new mapboxgl.Marker({ color: "#208A5D" })
      .setLngLat([target.lng, target.lat])
      .addTo(map);
    map.flyTo({ center: [target.lng, target.lat], zoom: 15 });
  }, [target]);

  // redraw when routes or the selection change
  useEffect(() => {
    routesRef.current = { routes, selectedRouteId };
    drawRoutes();
  }, [routes, selectedRouteId]);

  // frame all routes whenever a new set arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routes.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    routes.forEach((r) => r.geometry.forEach((c) => bounds.extend(c)));
    map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: 16, duration: 800 });
  }, [routes]);

  return (
    <div className="relative h-screen w-full">
      <div ref={mapContainer} className="absolute inset-0 h-full w-full" />
    </div>
  );
}