import { DEFAULT_WEIGHTS, recommendedRouteId } from "@/lib/routeScoring";
import type { LngLat, RouteComparison, RouteMode, RouteOption } from "@/types/route";

// kg CO2e per km for a typical passenger car; walking and cycling are treated as zero direct emissions
export const CAR_KG_CO2E_PER_KM = 0.17;
export const WALK_KG_CO2E_PER_KM = 0;
export const BIKE_KG_CO2E_PER_KM = 0;
export const CAR_KM_PER_LITER = 10;
export const FUEL_PRICE_PER_LITER = 1.0;
const KM_TO_MILES = 0.621371;
const ECO_POINTS_PER_TENTH_MILE = 1;

const PROFILES: { mode: RouteMode; profile: "walking" | "cycling" | "driving" }[] = [
    { mode: "WALK", profile: "walking" },
    { mode: "BIKE", profile: "cycling" },
    { mode: "CAR", profile: "driving" },
];

const CO2_PER_KM: Record<RouteMode, number> = {
    CAR: CAR_KG_CO2E_PER_KM,
    WALK: WALK_KG_CO2E_PER_KM,
    BIKE: BIKE_KG_CO2E_PER_KM,
};

export function calculateEcoScore(mode: RouteMode, distanceKm: number): number {
    if (mode === "CAR") return 0;

    const miles = distanceKm * KM_TO_MILES;
    return Math.floor((miles / 0.1) * ECO_POINTS_PER_TENTH_MILE);
}

type DirectionsResponse = {
    routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
        legs?: {
            summary?: string;
            steps?: {
                distance: number;
                duration: number;
                maneuver: { instruction: string; type: string };
            }[];
        }[];
    }[];
};

async function fetchRoute(
    mode: RouteMode,
    profile: string,
    from: LngLat,
    to: LngLat,
    signal?: AbortSignal,
): Promise<Omit<RouteOption, "estimatedCost" | "estimatedCo2Kg" | "ecoScore">> {
    const params = new URLSearchParams({
        geometries: "geojson",
        steps: "true",
        overview: "full",
        access_token: import.meta.env.VITE_MAPBOX_KEY,
    });
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?${params}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Directions (${profile}) failed: ${res.status}`);
    const data: DirectionsResponse = await res.json();
    const route = data.routes?.[0];
    if (!route) throw new Error(`No ${profile} route found`);
    return {
        routeId: mode.toLowerCase(),
        mode,
        distanceKm: route.distance / 1000,
        durationMinutes: Math.max(1, Math.round(route.duration / 60)),
        via: route.legs?.[0]?.summary || null,
        steps: (route.legs ?? [])
            .flatMap((leg) => leg.steps ?? [])
            .filter((s) => s.maneuver.type !== "arrive")
            .map((s) => ({
                instruction: s.maneuver.instruction,
                distanceKm: s.distance / 1000,
                durationSeconds: s.duration,
            })),
        geometry: route.geometry.coordinates,
    };
}

// Client-side stand-in for POST /api/v1/routes/compare; swap the body of this function once the backend exists.
export async function compareRoutes(
    from: LngLat,
    to: LngLat,
    signal?: AbortSignal,
): Promise<RouteComparison> {
    const settled = await Promise.allSettled(
        PROFILES.map(({ mode, profile }) => fetchRoute(mode, profile, from, to, signal)),
    );
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const base = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (base.length === 0) throw new Error("No routes found between these places.");

    const routes: RouteOption[] = base.map((r) => {
        const co2 = r.distanceKm * CO2_PER_KM[r.mode];
        return {
            ...r,
            estimatedCo2Kg: co2,
            estimatedCost: r.mode === "CAR" ? (r.distanceKm / CAR_KM_PER_LITER) * FUEL_PRICE_PER_LITER : 0,
            ecoScore: calculateEcoScore(r.mode, r.distanceKm),
        };
    });

    return { routes, recommendedRouteId: recommendedRouteId(routes, DEFAULT_WEIGHTS) };
}
