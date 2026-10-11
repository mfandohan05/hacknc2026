import { apiJson } from "@/services/api";
import type { LngLat } from "@/types/route";

export type TransitPreference = "ALL" | "BUS" | "SUBWAY" | "TRAIN";
export type TransitStep = {
    mode: string;
    instruction: string | null;
    distanceMeters: number;
    durationSeconds: number;
    line: string | null;
    headsign: string | null;
    departureStop: string | null;
    arrivalStop: string | null;
    departureTime: string | null;
    arrivalTime: string | null;
    agencies: string[];
};
export type TransitItinerary = {
    id: string;
    distanceMeters: number;
    durationSeconds: number;
    fare: number | null;
    currency: string | null;
    transfers: number;
    steps: TransitStep[];
};
export type TransitResponse = { routes: TransitItinerary[]; attribution: string };

export function getTransitRoutes(origin: LngLat, destination: LngLat,
    preference: TransitPreference, departureTime: string | undefined, signal?: AbortSignal) {
    return apiJson<TransitResponse>("/api/v1/transit/routes", {
        method: "POST", signal,
        body: JSON.stringify({
            origin: { latitude: origin.lat, longitude: origin.lng },
            destination: { latitude: destination.lat, longitude: destination.lng },
            preference, departureTime,
        }),
    });
}
