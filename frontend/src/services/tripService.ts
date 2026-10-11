import { apiJson } from "@/services/api";
import { CAR_KG_CO2E_PER_KM } from "@/services/routeService";
import type { LngLat, RouteMode, RouteOption } from "@/types/route";

export type TripMode = "WALKING" | "CYCLING" | "DRIVING" | "TRANSIT";

export type TripPoints = { walking: number; cycling: number; driving: number; transit: number };

export const pointsForMode = (points: TripPoints, mode: RouteMode) =>
    points[mode === "TRANSIT" ? "transit" : mode === "WALK" ? "walking" : mode === "BIKE" ? "cycling" : "driving"];

export type TripResponse = {
    points: TripPoints;
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
    BIKE: "CYCLING",
    CAR: "DRIVING",
    TRANSIT: "TRANSIT",
};

// A planned trip has estimates only; no balance is credited until completion.
export function createTrip(origin: LngLat, destination: LngLat, option: RouteOption) {
    const distanceKm = option.distanceKm;
    return apiJson<TripResponse>("/api/v1/trips", {
        method: "POST",
        body: JSON.stringify({
            originLatitude: origin.lat,
            originLongitude: origin.lng,
            destinationLatitude: destination.lat,
            destinationLongitude: destination.lng,
            mode: MODE_MAP[option.mode],
            distanceMeters: option.distanceKm * 1000,
            durationSeconds: option.durationMinutes * 60,
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

export const startTrip = (id: string) =>
    apiJson<TripResponse>(`/api/v1/trips/${encodeURIComponent(id)}/start`, { method: "POST" });

export const getTripPoints = (id: string) =>
    apiJson<TripPoints>(`/api/v1/trips/${encodeURIComponent(id)}/points`);

export const getPointBalance = () => apiJson<{ totalPoints: number }>("/api/v1/profiles/me");
