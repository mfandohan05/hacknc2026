import { ApiError, apiJson } from "./api";
import { cancelTrip, createTrip, getTripPoints, startTrip } from "./tripService";
import type { LngLat, RouteOption } from "@/types/route";

// Keep every created ID until cancellation succeeds, including requests still in flight.
export class TripSession {
    private trips = new Map<string, ReturnType<typeof createTrip>>();
    private started = new Set<string>();
    private finished = new Set<string>();

    plan(origin: LngLat, destination: LngLat, option: RouteOption) {
        let pending = this.trips.get(option.routeId);
        if (!pending) {
            pending = createTrip(origin, destination, option);
            this.trips.set(option.routeId, pending);
        }
        return pending;
    }

    async points(routeId: string) {
        const trip = await this.trips.get(routeId);
        if (!trip) throw new Error("Please reopen route options to plan your trip.");
        return getTripPoints(trip.id);
    }

    async start(routeId: string) {
        const trip = await this.trips.get(routeId);
        if (!trip) throw new Error("Please reopen route options to plan your trip.");
        await this.cancelExcept(routeId);
        if (!this.started.has(trip.id)) {
            try {
                await startTrip(trip.id);
            } catch (error) {
                // A lost response may leave the server already started; confirm before retrying.
                if (!(error instanceof ApiError) || error.status !== 409) throw error;
                const current = await apiJson<{ status: string }>(`/api/v1/trips/${trip.id}`);
                if (current.status !== "IN_PROGRESS") throw error;
            }
            this.started.add(trip.id);
        }
        return trip.id;
    }

    complete(id: string) { this.finished.add(id); }

    async cancelExcept(keep?: string) {
        const results = await Promise.allSettled([...this.trips].map(async ([key, pending]) => {
            if (key === keep) return;
            const trip = await pending.catch(() => null);
            if (trip && !this.finished.has(trip.id)) {
                try { await cancelTrip(trip.id); }
                catch (error) {
                    if (!(error instanceof ApiError) || error.status !== 404) throw error;
                }
            }
            this.trips.delete(key);
        }));
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
    }
}
