import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRoute } from "@/services/directionsService";
import {
    ARRIVAL_METERS,
    OFF_ROUTE_METERS,
    advanceStep,
    buildRouteInfo,
    locate,
    metersBetween,
    pendingVoice,
    pickBanner,
    pointAt,
    progressAt,
    routeBearingAt,
} from "@/lib/navigationMath";
import type { RouteInfo } from "@/lib/navigationMath";
import { cancelSpeech, speak, unlockSpeech } from "@/lib/speech";
import type { BannerInstruction, DirectionsRoute, DirectionsStep, NavPosition, NavProfile } from "@/types/navigation";
import type { LngLat } from "@/types/route";

export type NavPhase = "idle" | "previewing" | "navigating" | "arrived";
export type DemoSpeed = 1 | 2 | 4;

// consecutive off-route fixes before rerouting
const OFF_ROUTE_FIXES = 3;
// minimum gap between reroute requests
const REROUTE_COOLDOWN_MS = 8000;
// how long to wait for a first GPS fix before telling the user
const GPS_TIMEOUT_MS = 10000;
const DEMO_SPEED_MPS = 12;
const DEMO_TICK_MS = 250;

export type NavigationState = {
    phase: NavPhase;
    // fetching the preview route
    loading: boolean;
    error: string | null;
    profile: NavProfile;
    route: DirectionsRoute | null;
    steps: DirectionsStep[];
    stepIndex: number;
    // snapped to the route line
    position: { lng: number; lat: number; bearing: number } | null;
    distanceToManeuver: number;
    remainingDistance: number;
    remainingDuration: number;
    progress: number;
    offRoute: boolean;
    rerouting: boolean;
    rerouteError: string | null;
    isDemo: boolean;
    demoSpeed: DemoSpeed;
    muted: boolean;
    // navigating on real GPS before the first fix
    waitingForLocation: boolean;
    locationTimedOut: boolean;
};

const INITIAL: NavigationState = {
    phase: "idle",
    loading: false,
    error: null,
    profile: "driving",
    route: null,
    steps: [],
    stepIndex: 0,
    position: null,
    distanceToManeuver: 0,
    remainingDistance: 0,
    remainingDuration: 0,
    progress: 0,
    offRoute: false,
    rerouting: false,
    rerouteError: null,
    isDemo: false,
    demoSpeed: 1,
    muted: false,
    waitingForLocation: false,
    locationTimedOut: false,
};

type Core = {
    phase: NavPhase;
    profile: NavProfile;
    route: DirectionsRoute | null;
    info: RouteInfo | null;
    destination: LngLat | null;
    stepIndex: number;
    offCount: number;
    spoken: Set<string>;
    isDemo: boolean;
    demoDistance: number;
    demoSpeed: DemoSpeed;
    muted: boolean;
    lastPosition: NavPosition | null;
    rerouting: boolean;
    lastRerouteAt: number;
    controller: AbortController | null;
};

function messageOf(e: unknown): string {
    return e instanceof Error ? e.message : "Something went wrong.";
}

// Navigation state machine: idle -> previewing -> navigating -> arrived.
// Mutable bookkeeping lives in a ref so position handlers (GPS events, demo timer) never read stale state.
export function useNavigation() {
    const [view, setView] = useState<NavigationState>(INITIAL);
    const core = useRef<Core>({
        phase: "idle",
        profile: "driving",
        route: null,
        info: null,
        destination: null,
        stepIndex: 0,
        offCount: 0,
        spoken: new Set(),
        isDemo: false,
        demoDistance: 0,
        demoSpeed: 1,
        muted: false,
        lastPosition: null,
        rerouting: false,
        lastRerouteAt: 0,
        controller: null,
    });

    const patch = useCallback((p: Partial<NavigationState>) => setView((v) => ({ ...v, ...p })), []);

    const applyRoute = useCallback((route: DirectionsRoute) => {
        const c = core.current;
        c.route = route;
        c.info = buildRouteInfo(route);
        c.stepIndex = 0;
        c.offCount = 0;
        c.demoDistance = 0;
        c.spoken = new Set();
        return c.info;
    }, []);

    const reroute = useCallback(
        async (from: LngLat) => {
            const c = core.current;
            if (c.rerouting || !c.destination) return;
            c.rerouting = true;
            c.lastRerouteAt = Date.now();
            c.controller?.abort();
            const controller = new AbortController();
            c.controller = controller;
            patch({ rerouting: true, rerouteError: null });
            try {
                const route = await getRoute(c.profile, from, c.destination, controller.signal);
                if (c.phase !== "navigating") return;
                const info = applyRoute(route);
                const p = progressAt(info, 0, 0);
                patch({
                    route,
                    steps: info.steps,
                    stepIndex: 0,
                    distanceToManeuver: p.distanceToManeuver,
                    remainingDistance: p.remainingDistance,
                    remainingDuration: p.remainingDuration,
                    progress: 0,
                    offRoute: false,
                    rerouting: false,
                    rerouteError: null,
                });
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
                patch({ rerouting: false, rerouteError: messageOf(e) });
            } finally {
                c.rerouting = false;
            }
        },
        [applyRoute, patch],
    );

    // Single entry point for both real GPS fixes and the demo simulator.
    const handlePosition = useCallback(
        (pos: NavPosition) => {
            const c = core.current;
            if (c.phase !== "navigating" || !c.info) return;
            const info = c.info;
            const raw: [number, number] = [pos.lng, pos.lat];
            const located = locate(info, raw);

            // arrival
            if (metersBetween(raw, info.end) <= ARRIVAL_METERS) {
                c.phase = "arrived";
                cancelSpeech();
                if (!c.muted) speak("You have arrived.");
                patch({
                    phase: "arrived",
                    position: { lng: info.end[0], lat: info.end[1], bearing: routeBearingAt(info, info.totalLength) },
                    distanceToManeuver: 0,
                    remainingDistance: 0,
                    remainingDuration: 0,
                    progress: 1,
                    offRoute: false,
                    waitingForLocation: false,
                });
                return;
            }

            // off-route detection: a few consecutive fixes, then one debounced reroute
            c.offCount = located.offRoute > OFF_ROUTE_METERS ? c.offCount + 1 : 0;
            const offRoute = c.offCount >= OFF_ROUTE_FIXES;
            if (offRoute && !c.rerouting && Date.now() - c.lastRerouteAt > REROUTE_COOLDOWN_MS) {
                void reroute({ lng: pos.lng, lat: pos.lat });
            }

            const stepIndex = Math.max(c.stepIndex, advanceStep(info, c.stepIndex, located.along, located.snapped));
            c.stepIndex = stepIndex;
            const p = progressAt(info, stepIndex, located.along);

            if (!c.muted && !offRoute) {
                const due = pendingVoice(info.steps, stepIndex, p.distanceToManeuver, c.spoken);
                if (due) {
                    due.keys.forEach((k) => c.spoken.add(k));
                    speak(due.text);
                }
            }

            const shown = offRoute ? raw : located.snapped;
            patch({
                stepIndex,
                position: {
                    lng: shown[0],
                    lat: shown[1],
                    bearing: pos.heading ?? routeBearingAt(info, located.along),
                },
                distanceToManeuver: p.distanceToManeuver,
                remainingDistance: p.remainingDistance,
                remainingDuration: p.remainingDuration,
                progress: p.fraction,
                offRoute,
                waitingForLocation: false,
                locationTimedOut: false,
            });
        },
        [patch, reroute],
    );

    const preview = useCallback(
        async (profile: NavProfile, from: LngLat, to: LngLat): Promise<DirectionsRoute | null> => {
            const c = core.current;
            c.controller?.abort();
            const controller = new AbortController();
            c.controller = controller;
            c.phase = "idle";
            c.profile = profile;
            c.destination = to;
            patch({ ...INITIAL, muted: c.muted, loading: true, profile });
            try {
                const route = await getRoute(profile, from, to, controller.signal);
                const info = applyRoute(route);
                c.phase = "previewing";
                const p = progressAt(info, 0, 0);
                setView({
                    ...INITIAL,
                    muted: c.muted,
                    profile,
                    phase: "previewing",
                    route,
                    steps: info.steps,
                    distanceToManeuver: p.distanceToManeuver,
                    remainingDistance: p.remainingDistance,
                    remainingDuration: p.remainingDuration,
                });
                return route;
            } catch (e) {
                if ((e as Error).name === "AbortError") return null;
                patch({ loading: false, error: messageOf(e) });
                return null;
            }
        },
        [applyRoute, patch],
    );

    const start = useCallback(
        (opts: { demo: boolean }) => {
            const c = core.current;
            if (c.phase !== "previewing" || !c.info) return;
            c.phase = "navigating";
            c.isDemo = opts.demo;
            c.demoDistance = 0;
            c.offCount = 0;
            c.spoken = new Set();
            // must happen inside the tap handler for iOS
            if (c.muted) unlockSpeech();
            else unlockSpeech("Starting navigation.");

            patch({
                phase: "navigating",
                isDemo: opts.demo,
                waitingForLocation: !opts.demo && !c.lastPosition,
                locationTimedOut: false,
            });

            if (opts.demo) {
                const start = pointAt(c.info, 0);
                handlePosition({ lng: start[0], lat: start[1], heading: routeBearingAt(c.info, 0) });
            } else if (c.lastPosition) {
                handlePosition(c.lastPosition);
            }
        },
        [handlePosition, patch],
    );

    // Real GPS feed (from the map's GeolocateControl). Ignored in demo mode.
    const feedPosition = useCallback(
        (pos: NavPosition) => {
            const c = core.current;
            c.lastPosition = pos;
            if (c.phase === "navigating" && !c.isDemo) handlePosition(pos);
        },
        [handlePosition],
    );

    const exit = useCallback(() => {
        const c = core.current;
        c.controller?.abort();
        c.controller = null;
        c.phase = "idle";
        c.route = null;
        c.info = null;
        c.rerouting = false;
        c.offCount = 0;
        c.spoken = new Set();
        cancelSpeech();
        setView({ ...INITIAL, muted: c.muted });
    }, []);

    const retryReroute = useCallback(() => {
        const c = core.current;
        const from = c.lastPosition;
        if (!from) return;
        c.lastRerouteAt = 0;
        void reroute({ lng: from.lng, lat: from.lat });
    }, [reroute]);

    const toggleMuted = useCallback(() => {
        const c = core.current;
        c.muted = !c.muted;
        if (c.muted) cancelSpeech();
        patch({ muted: c.muted });
    }, [patch]);

    const setDemoSpeed = useCallback(
        (speed: DemoSpeed) => {
            core.current.demoSpeed = speed;
            patch({ demoSpeed: speed });
        },
        [patch],
    );

    // demo simulator: moves along the route line and feeds the same handler as GPS
    useEffect(() => {
        if (view.phase !== "navigating" || !view.isDemo) return;
        const id = setInterval(() => {
            const c = core.current;
            if (!c.info || c.rerouting || c.phase !== "navigating") return;
            c.demoDistance = Math.min(
                c.info.totalLength,
                c.demoDistance + DEMO_SPEED_MPS * c.demoSpeed * (DEMO_TICK_MS / 1000),
            );
            const point = pointAt(c.info, c.demoDistance);
            handlePosition({ lng: point[0], lat: point[1], heading: routeBearingAt(c.info, c.demoDistance) });
        }, DEMO_TICK_MS);
        return () => clearInterval(id);
    }, [view.phase, view.isDemo, handlePosition]);

    // tell the user when no GPS fix arrives (e.g. permission denied)
    useEffect(() => {
        if (!view.waitingForLocation) return;
        const id = setTimeout(() => patch({ locationTimedOut: true }), GPS_TIMEOUT_MS);
        return () => clearTimeout(id);
    }, [view.waitingForLocation, patch]);

    // cancel in-flight requests and speech on unmount
    useEffect(() => {
        const c = core.current;
        return () => {
            c.controller?.abort();
            cancelSpeech();
        };
    }, []);

    const banner: BannerInstruction | null = useMemo(
        () => pickBanner(view.steps[view.stepIndex], view.distanceToManeuver),
        [view.steps, view.stepIndex, view.distanceToManeuver],
    );

    return {
        ...view,
        banner,
        preview,
        start,
        feedPosition,
        exit,
        retryReroute,
        toggleMuted,
        setDemoSpeed,
    };
}
