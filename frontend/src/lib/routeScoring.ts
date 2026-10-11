import type { RouteOption } from "@/types/route";

export type PreferenceWeights = {
    environment: number;
    time: number;
    cost: number;
    comfort: number;
};

// raw slider values (0-100); normalized to sum to 1 before scoring
export const DEFAULT_WEIGHTS: PreferenceWeights = {
    environment: 40,
    time: 30,
    cost: 20,
    comfort: 10,
};

// comfort has no data source yet, so it is a mode-based heuristic: a base value minus an exertion penalty per km
const COMFORT_BASE = { CAR: 0.9, BIKE: 0.7, WALK: 0.8, TRANSIT: 0.8 } as const;
const COMFORT_PENALTY_PER_KM = { CAR: 0, BIKE: 0.04, WALK: 0.1, TRANSIT: 0 } as const;
const COMFORT_FLOOR = 0.1;

export function normalizeWeights(w: PreferenceWeights): PreferenceWeights {
    const sum = w.environment + w.time + w.cost + w.comfort;
    if (sum <= 0) return { environment: 0.25, time: 0.25, cost: 0.25, comfort: 0.25 };
    return {
        environment: w.environment / sum,
        time: w.time / sum,
        cost: w.cost / sum,
        comfort: w.comfort / sum,
    };
}

export function comfortScore(route: RouteOption): number {
    const raw = COMFORT_BASE[route.mode] - COMFORT_PENALTY_PER_KM[route.mode] * route.distanceKm;
    return Math.min(1, Math.max(COMFORT_FLOOR, raw));
}

// 1 = best (lowest) value in the set, 0 = worst; unknown values count as the worst
function lowerIsBetter(values: (number | null)[]): number[] {
    const known = values.filter((v): v is number => v !== null);
    if (known.length === 0) return values.map(() => 0);
    const min = Math.min(...known);
    const max = Math.max(...known);
    return values.map((v) => {
        if (v === null) return 0;
        if (max === min) return 1;
        return 1 - (v - min) / (max - min);
    });
}

function higherIsBetter(values: number[]): number[] {
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return values.map(() => 1);
    return values.map((value) => (value - min) / (max - min));
}

export function scoreRoutes(routes: RouteOption[], weights: PreferenceWeights): Map<string, number> {
    const w = normalizeWeights(weights);
    const time = lowerIsBetter(routes.map((r) => r.durationMinutes));
    const cost = lowerIsBetter(routes.map((r) => r.estimatedCost));
    // Normalize eco points only for comparing environmental preference.
    // Slider weights never change the raw points earned for a route.
    const environment = higherIsBetter(routes.map((r) => r.ecoScore));
    const scores = new Map<string, number>();
    routes.forEach((r, i) => {
        scores.set(
            r.routeId,
            w.environment * environment[i] + w.time * time[i] + w.cost * cost[i] + w.comfort * comfortScore(r),
        );
    });
    return scores;
}

export function recommendedRouteId(routes: RouteOption[], weights: PreferenceWeights): string | null {
    if (routes.length === 0) return null;
    const scores = scoreRoutes(routes, weights);
    return routes.reduce((best, r) => ((scores.get(r.routeId) ?? 0) > (scores.get(best.routeId) ?? 0) ? r : best))
        .routeId;
}
