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
import { clearNavSession } from "@/lib/navSession";
import type { NavSession } from "@/lib/navSession";
import { cancelSpeech, speak, unlockSpeech } from "@/lib/speech";
import type { BannerInstruction, DirectionsRoute, DirectionsStep, NavPosition, NavProfile } from "@/types/navigation";
import type { LngLat } from "@/types/route";

export type NavPhase = "idle" | "previewing" | "navigating" | "arrived";
export type DemoSpeed = 1 | 2 | 4;

const OFF_ROUTE_FIXES = 3;
const REROUTE_COOLDOWN_MS = 8000;
const GPS_TIMEOUT_MS = 10000;
const DEMO_SPEED_MPS = 12;
const DEMO_TICK_MS = 250;

export type NavigationState = {
    phase: NavPhase;
    loading: boolean;
    error: string | null;
    profile: NavProfile;
    route: DirectionsRoute | null;
    steps: DirectionsStep[];
    stepIndex: number;
    position: { lng: number; lat: number; bearing: number } | null;
    distanceToManeuver: number;
    remainingDistance: number;
    remainingDuration: number;
    progress: number;
    offRoute: boolean;
    rerouting: boolean;
    rerouteError: string | null;
    isDemo: boolean;
    isTransit: boolean;
    destination: LngLat | null;
    demoDistance: number;
    demoSpeed: DemoSpeed;
    muted: boolean;
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
    isTransit: false,
    destination: null,
    demoDistance: 0,
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
    transit: boolean;
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

function emptyCore(): Core {
    return {
        phase: "idle",
        profile: "driving",
        route: null,
        info: null,
        destination: null,
        stepIndex: 0,
        offCount: 0,
        spoken: new Set(),
        isDemo: false,
        transit: false,
        demoDistance: 0,
        demoSpeed: 1,
        muted: false,
        lastPosition: null,
        rerouting: false,
        lastRerouteAt: 0,
        controller: null,
    };
}

function coreFromSession(session: NavSession): Core {
    const info = buildRouteInfo(session.route);
    return {
        ...emptyCore(),
        phase: session.phase,
        profile: session.profile,
        route: session.route,
        info,
        destination: session.destination,
        stepIndex: Math.min(Math.max(0, session.stepIndex), Math.max(0, info.steps.length - 1)),
        isDemo: session.isDemo,
        transit: session.transit ?? false,
        demoDistance: session.demoDistance,
        muted: session.muted,
        lastPosition: session.lastPosition
            ? { lng: session.lastPosition.lng, lat: session.lastPosition.lat, heading: session.lastPosition.bearing }
            : null,
    };
}

function viewFromCore(core: Core): NavigationState {
    const info = core.info;
    if (!info || !core.route || core.phase === "idle") return INITIAL;

    const arrived = core.phase === "arrived";
    const located = core.lastPosition ? locate(info, [core.lastPosition.lng, core.lastPosition.lat]) : null;
    const p = arrived
        ? { distanceToManeuver: 0, remainingDistance: 0, remainingDuration: 0, fraction: 1 }
        : progressAt(info, core.stepIndex, located?.along ?? 0);

    return {
        ...INITIAL,
        phase: core.phase,
        profile: core.profile,
        route: core.route,
        steps: info.steps,
        stepIndex: core.stepIndex,
        position: core.lastPosition
            ? { lng: core.lastPosition.lng, lat: core.lastPosition.lat, bearing: core.lastPosition.heading ?? 0 }
            : null,
        distanceToManeuver: p.distanceToManeuver,
        remainingDistance: p.remainingDistance,
        remainingDuration: p.remainingDuration,
        progress: p.fraction,
        isDemo: core.isDemo,
        isTransit: core.transit,
        destination: core.destination,
        demoDistance: core.demoDistance,
        muted: core.muted,
        waitingForLocation: core.phase === "navigating" && !core.isDemo && !core.lastPosition,
    };
}

export function useNavigation(initialSession: NavSession | null = null) {
    const [initialCore] = useState(() => (initialSession ? coreFromSession(initialSession) : emptyCore()));
    const [view, setView] = useState<NavigationState>(() => viewFromCore(initialCore));
    const core = useRef<Core>(initialCore);

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

    const handlePosition = useCallback(
        (pos: NavPosition) => {
            const c = core.current;
            if (c.phase !== "navigating" || !c.info) return;
            const info = c.info;
            const raw: [number, number] = [pos.lng, pos.lat];
            const located = locate(info, raw);

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
                    demoDistance: c.demoDistance,
                });
                return;
            }

            c.offCount = located.offRoute > OFF_ROUTE_METERS ? c.offCount + 1 : 0;
            const offRoute = !c.transit && c.offCount >= OFF_ROUTE_FIXES;
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
                demoDistance: c.demoDistance,
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
            c.transit = false;
            clearNavSession();
            patch({ ...INITIAL, muted: c.muted, loading: true, profile, destination: to });
            try {
                const route = await getRoute(profile, from, to, controller.signal);
                const info = applyRoute(route);
                c.phase = "previewing";
                const p = progressAt(info, 0, 0);
                setView({
                    ...INITIAL,
                    muted: c.muted,
                    profile,
                    destination: to,
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

    const previewTransit = useCallback(
        (route: DirectionsRoute, destination: LngLat) => {
            const c = core.current;
            c.controller?.abort();
            c.controller = null;
            c.phase = "idle";
            c.profile = "walking";
            c.destination = destination;
            c.transit = true;
            clearNavSession();
            const info = applyRoute(route);
            c.phase = "previewing";
            const p = progressAt(info, 0, 0);
            setView({
                ...INITIAL,
                muted: c.muted,
                profile: "walking",
                destination,
                isTransit: true,
                phase: "previewing",
                route,
                steps: info.steps,
                distanceToManeuver: p.distanceToManeuver,
                remainingDistance: p.remainingDistance,
                remainingDuration: p.remainingDuration,
            });
        },
        [applyRoute],
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
        c.transit = false;
        c.offCount = 0;
        c.spoken = new Set();
        cancelSpeech();
        clearNavSession();
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

    useEffect(() => {
        if (!view.waitingForLocation) return;
        const id = setTimeout(() => patch({ locationTimedOut: true }), GPS_TIMEOUT_MS);
        return () => clearTimeout(id);
    }, [view.waitingForLocation, patch]);

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
        previewTransit,
        start,
        feedPosition,
        exit,
        retryReroute,
        toggleMuted,
        setDemoSpeed,
    };
}
