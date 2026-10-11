export type RouteMode = "WALK" | "BIKE" | "CAR";

export type LngLat = {
    lng: number;
    lat: number;
};

export type RouteStep = {
    instruction: string;
    distanceKm: number;
    durationSeconds: number;
};

export type RouteOption = {
    routeId: string;
    mode: RouteMode;
    distanceKm: number;
    durationMinutes: number;
    // estimates; null means unknown and must never be displayed as free / zero
    estimatedCost: number | null;
    estimatedCo2Kg: number | null;
    // Points earned: 0 for driving, one point per 0.1 miles for walking/biking
    ecoScore: number;
    // short "via" description of the main roads, when the provider supplies one
    via: string | null;
    // turn-by-turn breakdown, excluding the final arrival step
    steps: RouteStep[];
    // line to draw on the map as [lng, lat] pairs (client-side addition to the backend shape)
    geometry: [number, number][];
};

export type RouteComparison = {
    routes: RouteOption[];
    recommendedRouteId: string | null;
};
