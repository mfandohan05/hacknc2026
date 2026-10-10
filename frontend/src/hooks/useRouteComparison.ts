import { useEffect, useState } from "react";
import { compareRoutes } from "@/services/routeService";
import type { LngLat, RouteComparison } from "@/types/route";

type Settled = { key: string; data: RouteComparison | null; error: string | null };

export function useRouteComparison(origin: LngLat | null, destination: LngLat | null) {
    const [settled, setSettled] = useState<Settled | null>(null);

    const oLng = origin?.lng;
    const oLat = origin?.lat;
    const dLng = destination?.lng;
    const dLat = destination?.lat;
    const key =
        oLng !== undefined && oLat !== undefined && dLng !== undefined && dLat !== undefined
            ? `${oLng},${oLat};${dLng},${dLat}`
            : null;

    useEffect(() => {
        if (key === null || oLng === undefined || oLat === undefined || dLng === undefined || dLat === undefined) {
            return;
        }
        const controller = new AbortController();
        compareRoutes({ lng: oLng, lat: oLat }, { lng: dLng, lat: dLat }, controller.signal)
            .then((data) => setSettled({ key, data, error: null }))
            .catch((e: Error) => {
                if (e.name === "AbortError") return;
                setSettled({ key, data: null, error: e.message });
            });
        return () => controller.abort();
    }, [key, oLng, oLat, dLng, dLat]);

    const current = key !== null && settled?.key === key ? settled : null;

    return {
        data: current?.data ?? null,
        error: current?.error ?? null,
        loading: key !== null && current === null,
    };
}
