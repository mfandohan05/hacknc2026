import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from 'react';
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

export default function InteractiveMap() {
    const mapContainer = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapContainer) return;

        const map = new mapboxgl.Map({
            container: 'map', // container ID
            style: 'mapbox://styles/mapbox/streets-v12', // style URL
            center: [-74.5, 40], // starting position [lng, lat]
            zoom: 9 // starting zoom
        });

        map.addControl(new mapboxgl.NavigationControl());
        map.scrollZoom.disable();   
        
        return () => map.remove();
    }, [])

    return (
        <div ref={mapContainer} id="map" className="absolute inset-0 h-full w-full" />
    )
}