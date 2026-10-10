import { useEffect, useState } from "react";
import type { LngLat } from "@/types/route";

// one-shot browser geolocation; null until granted
export function useUserLocation(): LngLat | null {
    const [location, setLocation] = useState<LngLat | null>(null);

    useEffect(() => {
        if (!("geolocation" in navigator)) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
            () => setLocation(null),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        );
    }, []);

    return location;
}
