import { ApiError, apiJson } from "./api";
import { cancelTrip, createTrip, estimateTripPoints, getTripPoints, startTrip } from "./tripService";
import type { LngLat, RouteOption } from "@/types/route";

// Keep every created ID until cancellation succeeds, including requests still in flight.
export class TripSession {
    private plans = new Map<string, { origin: LngLat; destination: LngLat; option: RouteOption }>();
    private trips = new Map<string, ReturnType<typeof createTrip>>();
    private starting = new Map<string, Promise<string>>();
    private started = new Set<string>();
    private finished = new Set<string>();

    plan(origin: LngLat, destination: LngLat, option: RouteOption) {
        this.plans.set(option.routeId, { origin, destination, option });
    }

    async points(routeId: string) {
        const plan = this.plans.get(routeId);
        if (plan) return estimateTripPoints(plan.origin, plan.destination, plan.option);
        const trip = await this.trips.get(routeId);
        if (!trip) throw new Error("Please reopen route options to plan your trip.");
        return getTripPoints(trip.id);
    }

    start(routeId: string): Promise<string> {
        let pending = this.starting.get(routeId);
        if (!pending) {
            pending = this.startPlanned(routeId).catch((error: unknown) => {
                this.starting.delete(routeId);
                throw error;
            });
            this.starting.set(routeId, pending);
        }
        return pending;
    }

    private async startPlanned(routeId: string) {
        let pending = this.trips.get(routeId);
        if (!pending) {
            const plan = this.plans.get(routeId);
            if (!plan) throw new Error("Please reopen route options to plan your trip.");
            pending = createTrip(plan.origin, plan.destination, plan.option).catch((error: unknown) => {
                this.trips.delete(routeId);
                throw error;
            });
            this.trips.set(routeId, pending);
        }
        const trip = await pending;
        if (!trip) throw new Error("Please reopen route options to plan your trip.");
        await this.cancelExcept(routeId);
        if (!this.started.has(trip.id)) {
            if (!this.plans.has(routeId)) throw new Error("Trip start canceled.");
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

    // Registers a trip that was already started in an earlier page load, so it can still be
    // completed or cancelled. Returns the key to pass to cancelExcept to keep it.
    adopt(id: string) {
        const key = `restored:${id}`;
        if (!this.trips.has(key)) {
            this.trips.set(key, Promise.resolve({ id } as Awaited<ReturnType<typeof createTrip>>));
            this.started.add(id);
        }
        return key;
    }

    complete(id: string) { this.finished.add(id); }

    async cancelExcept(keep?: string) {
        for (const key of this.plans.keys()) {
            if (key !== keep) this.plans.delete(key);
        }
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
            this.starting.delete(key);
        }));
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
    }
}
