import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useImperativeHandle, useRef } from "react";
import type { RouteOption } from "@/types/route";
import type { Coordinate } from "@/types/navigation";
import { syncNavRoute, removeNavRoute } from "@/lib/navRouteLayer";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

export type MapHandle = {
  // fly to a place and drop (or move) the single destination marker
  showPlace: (place: { longitude: number; latitude: number }) => void;
  clearPlace: () => void;
  // the underlying map, for camera control and markers; null before it exists
  getMap: () => mapboxgl.Map | null;
  fitToCoordinates: (coords: Coordinate[]) => void;
  flyToPoint: (point: Coordinate, zoom?: number) => void;
};

export type UserLocationUpdate = {
  longitude: number;
  latitude: number;
  // degrees clockwise from north, null when unavailable
  heading: number | null;
};

type Props = {
  ref?: React.Ref<MapHandle>;
  onMapClick?: () => void;
  onUserLocation?: (location: UserLocationUpdate) => void;
  navRoute?: Coordinate[] | null;
  routes?: RouteOption[];
  selectedRouteId?: string | null;
};

const ROUTES_SOURCE = "routes";
const ROUTES_LAYER = "routes-line";
// keep the fitted route clear of the top bar and the bottom sheet
const FIT_PADDING = { top: 140, bottom: 380, left: 40, right: 40 };

function createMarkerElement() {
  const el = document.createElement("div");
  el.style.cssText =
    "width:22px;height:22px;border-radius:9999px;background:#54C571;border:3px solid #fff;box-shadow:0 2px 6px rgba(23,51,74,0.35);";
  return el;
}

export default function InteractiveMap({ ref, onMapClick, onUserLocation, navRoute = null, routes = [], selectedRouteId = null }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onUserLocationRef = useRef(onUserLocation);
  const loadedRef = useRef(false);
  const routesRef = useRef({ routes, selectedRouteId });
  const navRouteRef = useRef(navRoute);

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
    onUserLocationRef.current = onUserLocation;
  }, [onMapClick, onUserLocation]);

  useImperativeHandle(ref, () => ({
    showPlace: ({ longitude, latitude }) => {
      const map = mapRef.current;
      if (!map) return;
      markerRef.current?.remove();
      markerRef.current = new mapboxgl.Marker({ element: createMarkerElement() })
        .setLngLat([longitude, latitude])
        .addTo(map);
      // clear any padding left over from fitting a route so the place lands mid-screen
      map.flyTo({ center: [longitude, latitude], zoom: 15, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
    },
    clearPlace: () => {
      markerRef.current?.remove();
      markerRef.current = null;
    },
    getMap: () => mapRef.current,
    fitToCoordinates: (coords) => {
      const map = mapRef.current;
      if (!map || coords.length === 0) return;
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: 17, duration: 800 });
    },
    flyToPoint: (point, zoom = 17) => {
      mapRef.current?.flyTo({ center: point, zoom });
    },
  }));

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
    geolocate.on("geolocate", (e: GeolocationPosition) => {
      const { heading } = e.coords;
      onUserLocationRef.current?.({
        longitude: e.coords.longitude,
        latitude: e.coords.latitude,
        heading: heading !== null && Number.isFinite(heading) ? heading : null,
      });
    });
    // sources and layers are lost when the style reloads, so draw them again
    map.on("style.load", () => {
      if (!loadedRef.current) return;
      drawRoutes();
      syncNavRoute(map, navRouteRef.current);
    });
    map.addControl(geolocate, "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      loadedRef.current = true;
      drawRoutes();
      syncNavRoute(map, navRouteRef.current);
      geolocate.trigger();
    });

    return () => {
      removeNavRoute(map);
      markerRef.current?.remove();
      markerRef.current = null;
      loadedRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // redraw when routes or the selection change
  useEffect(() => {
    routesRef.current = { routes, selectedRouteId };
    drawRoutes();
  }, [routes, selectedRouteId]);

  useEffect(() => {
    navRouteRef.current = navRoute;
    const map = mapRef.current;
    if (map && loadedRef.current) syncNavRoute(map, navRoute);
  }, [navRoute]);

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