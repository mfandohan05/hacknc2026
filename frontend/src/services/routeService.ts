import { ApiError, apiJson } from "@/services/api";
import { DEFAULT_WEIGHTS } from "@/lib/routeScoring";
import type { LngLat, RouteComparison, RouteMode, RouteOption } from "@/types/route";

// kg CO2e per km for a solo-occupant car. Mirrors the backend's EmissionService; used for the
// trip baseline sent to /api/v1/trips/start.
export const CAR_KG_CO2E_PER_KM = 0.192;

type ApiTravelMode = "WALKING" | "CYCLING" | "DRIVING";

// POST /api/v1/routes/compare response (RouteResponse / RouteOption on the backend)
type CompareResponse = {
    routes: {
        routeId: string;
        mode: ApiTravelMode;
        distanceKm: number;
        durationMinutes: number;
        estimatedCost: number | null;
        estimatedCo2Kg: number | null;
        ecoScore: number;
        geometry: [number, number][];
    }[];
    recommendedRouteId: string | null;
};

const MODE_MAP: Record<ApiTravelMode, RouteMode> = {
    WALKING: "WALK",
    CYCLING: "BIKE",
    DRIVING: "CAR",
};

// Compares walking, cycling and driving through the backend, which owns the Mapbox calls and the
// emissions and cost estimates.
export async function compareRoutes(from: LngLat, to: LngLat, signal?: AbortSignal): Promise<RouteComparison> {
    let data: CompareResponse;
    try {
        data = await apiJson<CompareResponse>("/api/v1/routes/compare", {
            method: "POST",
            signal,
            body: JSON.stringify({
                origin: { latitude: from.lat, longitude: from.lng },
                destination: { latitude: to.lat, longitude: to.lng },
                preferences: {
                    environment: DEFAULT_WEIGHTS.environment,
                    time: DEFAULT_WEIGHTS.time,
                    cost: DEFAULT_WEIGHTS.cost,
                },
            }),
        });
    } catch (e) {
        if (e instanceof ApiError && (e.status === 502 || e.status === 503)) {
            throw new Error("The route service is unavailable right now. Try again in a moment.", { cause: e });
        }
        throw e;
    }

    if (data.routes.length === 0) throw new Error("No routes found between these places.");

    // eco score: how much of a car's emissions this route avoids (car = 0, no emissions = 100).
    // The backend's own ecoScore is a blend of the user's priorities, so it is not shown as one.
    const carCo2 = data.routes.find((r) => r.mode === "DRIVING")?.estimatedCo2Kg ?? null;

    const routes: RouteOption[] = data.routes.map((r) => {
        const co2 = r.estimatedCo2Kg;
        const ecoScore =
            co2 === null
                ? 0
                : carCo2 !== null && carCo2 > 0
                  ? Math.round(Math.min(100, Math.max(0, (1 - co2 / carCo2) * 100)))
                  : 100;
        return {
            routeId: r.routeId,
            mode: MODE_MAP[r.mode],
            distanceKm: r.distanceKm,
            durationMinutes: Math.max(1, Math.round(r.durationMinutes)),
            estimatedCost: r.estimatedCost,
            estimatedCo2Kg: co2,
            ecoScore,
            geometry: r.geometry,
        };
    });

    // The recommendation is re-ranked live on the client (the comfort slider has no backend
    // equivalent), so the backend's pick is only used when the client has nothing to rank.
    return { routes, recommendedRouteId: data.recommendedRouteId };
}
