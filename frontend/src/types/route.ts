export type RouteMode = "WALK" | "BIKE" | "CAR";

export type LngLat = {
    lng: number;
    lat: number;
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
    // Server estimate; awarded only on successful completion.
    tripPoints?: number;
    // line to draw on the map as [lng, lat] pairs
    geometry: [number, number][];
};

export type RouteComparison = {
    routes: RouteOption[];
    recommendedRouteId: string | null;
};
