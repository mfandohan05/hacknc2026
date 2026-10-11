import type { LngLat } from "@/types/route";
import type { DirectionsRoute, NavProfile } from "@/types/navigation";

export type DirectionsErrorCode = "network" | "http" | "no_route";

export class DirectionsError extends Error {
    readonly code: DirectionsErrorCode;
    readonly status?: number;

    constructor(code: DirectionsErrorCode, message: string, status?: number) {
        super(message);
        this.name = "DirectionsError";
        this.code = code;
        this.status = status;
    }
}

export async function getRoute(
    profile: NavProfile,
    from: LngLat,
    to: LngLat,
    signal?: AbortSignal,
): Promise<DirectionsRoute> {
    const params = new URLSearchParams({
        steps: "true",
        geometries: "geojson",
        overview: "full",
        banner_instructions: "true",
        voice_instructions: "true",
        language: "en",
        access_token: import.meta.env.VITE_MAPBOX_KEY,
    });
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?${params}`;

    let res: Response;
    try {
        res = await fetch(url, { signal });
    } catch (e) {
        if ((e as Error).name === "AbortError") throw e;
        throw new DirectionsError("network", "Couldn't reach the directions service.");
    }

    if (!res.ok) {
        throw new DirectionsError("http", `Directions request failed (${res.status}).`, res.status);
    }

    const data: { routes?: DirectionsRoute[] } = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new DirectionsError("no_route", "No route found for this trip.");
    return route;
}
