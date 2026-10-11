import { ApiError, apiJson } from "@/services/api";
import { DEFAULT_WEIGHTS } from "@/lib/routeScoring";
import type { LngLat, RouteComparison, RouteMode, RouteOption } from "@/types/route";

export const CAR_KG_CO2E_PER_KM = 0.192;

type ApiTravelMode = "WALKING" | "CYCLING" | "DRIVING";

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

    return { routes, recommendedRouteId: data.recommendedRouteId };
}
