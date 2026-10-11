export type RouteMode = "WALK" | "BIKE" | "CAR" | "TRANSIT";

export type LngLat = {
    lng: number;
    lat: number;
};

export type RouteOption = {
    routeId: string;
    mode: RouteMode;
    distanceKm: number;
    durationMinutes: number;
    estimatedCost: number | null;
    estimatedCo2Kg: number | null;
    ecoScore: number;
    tripPoints?: number;
    geometry: [number, number][];
};

export type RouteComparison = {
    routes: RouteOption[];
    recommendedRouteId: string | null;
};
