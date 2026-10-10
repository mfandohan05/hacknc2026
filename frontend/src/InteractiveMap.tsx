import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useState, useEffect, useRef } from "react";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

type Location = {
    latitude: number;
    longitude: number;
}

export default function InteractiveMap() {
    const mapContainer = useRef<HTMLDivElement>(null);

    // Location states
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);
    const [location, setLocation] = useState<Location | null>(null);

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
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
        map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
        return () =>  {
            map.remove();
            mapRef.current = null;
        }
    }, []);

    // GPT Codex helped implement asking for location plus tracking
    // Ask for location and track
    useEffect(() => {
        if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser.");
        return;
        }

        const watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;

            setLocation({ latitude, longitude });

            const map = mapRef.current;
            if (!map) return;

            if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({ color: "#ef4444" })
                .setLngLat([longitude, latitude])
                .addTo(map);
            } else {
            markerRef.current.setLngLat([longitude, latitude]);
            }

            map.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            });
        },
        (error) => {
            console.error("Unable to get location:", error.message);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 10_000,
            timeout: 10_000,
        }
        );

        return () => {
        navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    return (
        <div className="relative h-screen w-full">
            <div ref={mapContainer} id="map" className="absolute inset-0 h-full w-full" />
            {location && (
                <div className="absolute bottom-4 left-4 z-10 rounded bg-white p-3 shadow">
                    Lat: {location.latitude.toFixed(5)}
                    <br />
                    Lng: {location.longitude.toFixed(5)}
                </div>
            )}
        </div>
    );
}