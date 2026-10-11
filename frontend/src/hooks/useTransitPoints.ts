import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TripSession } from "@/services/tripSession";
import { pointsForMode } from "@/services/tripService";
import { transitTripOption } from "@/services/transitService";
import type { TransitItinerary } from "@/services/transitService";
import type { LngLat } from "@/types/route";

// Estimate-only trips are cancelled when the results change or the view closes.
export function useTransitPoints(routes: TransitItinerary[], origin: LngLat | null, destination: LngLat | null) {
    const { user } = useAuth();
    const key = user && origin && destination && routes.length
        ? JSON.stringify([user.id, origin, destination, routes.map(transitTripOption)]) : null;
    const [settled, setSettled] = useState<{ key: string; points: Record<string, number>; error: string | null } | null>(null);

    useEffect(() => {
        if (!key) return;
        const [, from, to, options] = JSON.parse(key) as [string, LngLat, LngLat, ReturnType<typeof transitTripOption>[]];
        const session = new TripSession();
        let active = true;
        void Promise.all(options.map(async (option) => {
            await session.plan(from, to, option);
            if (!active) return null;
            const points = await session.points(option.routeId);
            return [option.routeId, pointsForMode(points, "TRANSIT")] as const;
        })).then((entries) => {
            if (active) setSettled({ key, points: Object.fromEntries(entries.filter((entry) => entry !== null)), error: null });
        }).catch((cause: unknown) => {
            if (active) setSettled({ key, points: {}, error: cause instanceof Error ? cause.message : "Couldn't load transit points." });
        });
        return () => {
            active = false;
            void session.cancelExcept().catch(console.error);
        };
    }, [key]);

    const current = key && settled?.key === key ? settled : null;
    return { points: current?.points ?? {}, loading: !!key && !current, error: current?.error ?? null };
}
