import { apiJson } from "@/services/api";
import { CAR_KG_CO2E_PER_KM } from "@/services/routeService";
import type { DirectionsRoute } from "@/types/navigation";
import type { LngLat, RouteMode, RouteOption } from "@/types/route";

export type TripMode = "WALKING" | "BIKING" | "DRIVING";

export type TripResponse = {
    id: string;
    mode: TripMode | null;
    status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | null;
    distanceMeters: number | null;
    durationSeconds: number | null;
    estimatedCo2Kg: number | null;
    co2SavedKg: number | null;
    createdAt: string | null;
    completedAt: string | null;
};

export type TripPage = {
    content: TripResponse[];
    totalElements: number;
};

const MODE_MAP: Record<RouteMode, TripMode> = {
    WALK: "WALKING",
    BIKE: "BIKING",
    CAR: "DRIVING",
};

// Starts a server-side trip for a real (non-demo) navigation session.
export function startTrip(origin: LngLat, destination: LngLat, option: RouteOption, route: DirectionsRoute) {
    const distanceKm = route.distance / 1000;
    return apiJson<TripResponse>("/api/v1/trips/start", {
        method: "POST",
        body: JSON.stringify({
            originLatitude: origin.lat,
            originLongitude: origin.lng,
            destinationLatitude: destination.lat,
            destinationLongitude: destination.lng,
            mode: MODE_MAP[option.mode],
            distanceMeters: route.distance,
            durationSeconds: route.duration,
            estimatedCo2Kg: option.estimatedCo2Kg ?? 0,
            // what the same distance would emit by car
            baselineCo2Kg: distanceKm * CAR_KG_CO2E_PER_KM,
            estimatedCost: option.estimatedCost,
        }),
    });
}

export const completeTrip = (id: string) =>
    apiJson<TripResponse>(`/api/v1/trips/${encodeURIComponent(id)}/complete`, { method: "POST" });

export const cancelTrip = (id: string) =>
    apiJson<TripResponse>(`/api/v1/trips/${encodeURIComponent(id)}/cancel`, { method: "POST" });

export const getTrips = (size = 20) => apiJson<TripPage>(`/api/v1/trips?size=${size}`);
