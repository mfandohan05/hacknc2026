import { useEffect, useState } from "react";
import { ApiError } from "@/services/api";
import { getTransitRoutes } from "@/services/transitService";
import type { TransitItinerary } from "@/services/transitService";
import type { LngLat } from "@/types/route";

type Settled = { key: string; routes: TransitItinerary[]; error: string | null };

export function useTransitRoutes(origin: LngLat | null, destination: LngLat | null, enabled: boolean) {
    const [settled, setSettled] = useState<Settled | null>(null);

    const oLat = origin?.lat;
    const oLng = origin?.lng;
    const dLat = destination?.lat;
    const dLng = destination?.lng;
    const key =
        enabled && oLat !== undefined && oLng !== undefined && dLat !== undefined && dLng !== undefined
            ? `${oLat},${oLng};${dLat},${dLng}`
            : null;

    useEffect(() => {
        if (key === null || oLat === undefined || oLng === undefined || dLat === undefined || dLng === undefined) {
            return;
        }
        const controller = new AbortController();
        getTransitRoutes({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }, "ALL", undefined, controller.signal)
            .then((data) => setSettled({ key, routes: data.routes, error: null }))
            .catch((e: unknown) => {
                if ((e as Error).name === "AbortError") return;
                setSettled({
                    key,
                    routes: [],
                    error:
                        e instanceof ApiError && e.status === 503
                            ? "Public transport is unavailable right now."
                            : "Couldn't load public transport.",
                });
            });
        return () => controller.abort();
    }, [key, oLat, oLng, dLat, dLng]);

    const current = key !== null && settled?.key === key ? settled : null;

    return {
        routes: current?.routes ?? [],
        error: current?.error ?? null,
        loading: key !== null && current === null,
    };
}
