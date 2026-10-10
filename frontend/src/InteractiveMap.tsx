import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

export default function InteractiveMap() {
    const mapContainer = useRef<HTMLDivElement>(null);

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

        map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
        map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
        map.scrollZoom.disable();

        return () => map.remove();
    }, []);

    return <div ref={mapContainer} className="absolute inset-0 h-full w-full" />;
}