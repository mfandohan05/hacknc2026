const BASE_URL = "https://api.mapbox.com/search/searchbox/v1";

export type Suggestion = {
    mapbox_id: string;
    name: string;
    place_formatted?: string;
};

export type SelectedPlace = {
    mapboxId: string;
    name: string;
    address: string;
    longitude: number;
    latitude: number;
};

type SuggestResponse = {
    suggestions?: Suggestion[];
};

type RetrieveResponse = {
    features?: {
        geometry: { coordinates: [number, number] };
        properties: { mapbox_id?: string; name: string; full_address?: string; place_formatted?: string };
    }[];
};

export async function suggestPlaces(
    query: string,
    sessionToken: string,
    near?: { longitude: number; latitude: number } | null,
    signal?: AbortSignal,
): Promise<Suggestion[]> {
    const params = new URLSearchParams({
        q: query,
        access_token: import.meta.env.VITE_MAPBOX_KEY,
        session_token: sessionToken,
        limit: "5",
        language: "en",
    });
    if (near) params.set("proximity", `${near.longitude},${near.latitude}`);

    const res = await fetch(`${BASE_URL}/suggest?${params}`, { signal });
    if (!res.ok) throw new Error(`Place suggestions failed: ${res.status}`);
    const data: SuggestResponse = await res.json();
    return data.suggestions ?? [];
}

export async function retrievePlace(
    mapboxId: string,
    sessionToken: string,
    signal?: AbortSignal,
): Promise<SelectedPlace> {
    const params = new URLSearchParams({
        access_token: import.meta.env.VITE_MAPBOX_KEY,
        session_token: sessionToken,
    });

    const res = await fetch(`${BASE_URL}/retrieve/${encodeURIComponent(mapboxId)}?${params}`, { signal });
    if (!res.ok) throw new Error(`Place lookup failed: ${res.status}`);
    const data: RetrieveResponse = await res.json();
    const feature = data.features?.[0];
    if (!feature) throw new Error("Place not found");

    const [longitude, latitude] = feature.geometry.coordinates;
    return {
        mapboxId: feature.properties.mapbox_id ?? mapboxId,
        name: feature.properties.name,
        address: feature.properties.full_address ?? feature.properties.place_formatted ?? "",
        longitude,
        latitude,
    };
}
