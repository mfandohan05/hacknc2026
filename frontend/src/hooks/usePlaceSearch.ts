import { useEffect, useState } from "react";

export type SearchResult = {
    id: string;
    name: string;
    address: string;
    lng: number;
    lat: number;
};

type GeocodeFeature = {
    properties: { mapbox_id: string; name: string; place_formatted?: string; full_address?: string };
    geometry: { coordinates: [number, number] };
};

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

// Debounced place autocomplete against the Mapbox Geocoding API
export function usePlaceSearch(query: string, enabled = true) {
    // the query the stored results/error belong to; loading means it lags behind the input
    const [settled, setSettled] = useState<{ q: string; results: SearchResult[]; error: boolean } | null>(null);

    const q = query.trim();
    const active = enabled && q.length >= MIN_CHARS;

    useEffect(() => {
        if (!active) return;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    q,
                    autocomplete: "true",
                    limit: "5",
                    proximity: "ip",
                    access_token: import.meta.env.VITE_MAPBOX_KEY,
                });
                const res = await fetch(
                    `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
                    { signal: controller.signal },
                );
                if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
                const data: { features: GeocodeFeature[] } = await res.json();
                setSettled({
                    q,
                    error: false,
                    results: data.features.map((f) => ({
                        id: f.properties.mapbox_id,
                        name: f.properties.name,
                        address: f.properties.place_formatted ?? f.properties.full_address ?? "",
                        lng: f.geometry.coordinates[0],
                        lat: f.geometry.coordinates[1],
                    })),
                });
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
                setSettled({ q, results: [], error: true });
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q, active]);

    const current = active && settled?.q === q ? settled : null;

    return {
        results: current?.results ?? [],
        loading: active && current === null,
        error: current?.error ?? false,
    };
}
