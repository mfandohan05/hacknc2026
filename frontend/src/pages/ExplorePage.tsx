import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavigationBar from "../NavigationBar";
import MapSearchBox from "@/components/MapSearchBox";
import InteractiveMap from "../InteractiveMap";
import type { MapHandle, UserLocationUpdate } from "../InteractiveMap";
import DirectionsSheet from "../DirectionsSheet";
import DirectionsScreen from "../DirectionsScreen";
import type { DirectionsResult } from "../DirectionsScreen";
import RouteOptionsScreen from "@/components/routes/RouteOptionsScreen";
import TransitScreen from "@/components/routes/TransitScreen";
import { useTransitRoutes } from "@/hooks/useTransitRoutes";
import type { TransitItinerary, TransitPreference } from "@/services/transitService";
import { transitTripOption } from "@/services/transitService";
import { getRoute } from "@/services/directionsService";
import { itineraryToRoute } from "@/lib/transitRoute";
import DirectionsPreviewPanel from "@/components/navigation/DirectionsPreviewPanel";
import NavBanner from "@/components/navigation/NavBanner";
import TripPanel from "@/components/navigation/TripPanel";
import ArrivedCard from "@/components/navigation/ArrivedCard";
import NavToast from "@/components/navigation/NavToast";
import RecenterButton from "@/components/navigation/RecenterButton";
import { useNavigation } from "@/hooks/useNavigation";
import { useNavigationCamera } from "@/hooks/useNavigationCamera";
import { useRouteComparison } from "@/hooks/useRouteComparison";
import { useAuth } from "@/hooks/useAuth";
import { useWakeLock } from "@/hooks/useWakeLock";
import { runViewTransition } from "@/lib/viewTransition";
import { loadLastLocation, saveLastLocation } from "@/lib/locationStorage";
import { loadNavSession, saveNavSession } from "@/lib/navSession";
import { DEFAULT_WEIGHTS, recommendedRouteId } from "@/lib/routeScoring";
import type { PreferenceWeights } from "@/lib/routeScoring";
import type { SelectedPlace } from "@/services/searchService";
import { completeTrip, getPointBalance, pointsForMode } from "@/services/tripService";
import { TripSession } from "@/services/tripSession";
import type { DirectionsStep, NavProfile } from "@/types/navigation";
import type { RouteMode, RouteOption } from "@/types/route";

const TAB_TO_ROUTE_MODE: Partial<Record<DirectionsResult["mode"], RouteMode>> = {
    drive: "CAR",
    walk: "WALK",
    bike: "BIKE",
};

const ROUTE_MODE_TO_PROFILE: Record<RouteMode, NavProfile> = {
    CAR: "driving",
    WALK: "walking",
    BIKE: "cycling",
    TRANSIT: "walking",
};

const PROFILE_TO_ROUTE_MODE: Record<NavProfile, RouteMode> = {
    driving: "CAR",
    walking: "WALK",
    cycling: "BIKE",
};

const PROFILE_LABEL: Record<NavProfile, string> = {
    driving: "Driving",
    walking: "Walking",
    cycling: "Cycling",
};

const LOCATION_JITTER_DEG = 0.0005;

const PEEK_FIT_BOTTOM_PADDING = 290;

const NO_ROUTES: RouteOption[] = [];

function ExplorePage() {
    const [transitPreference, setTransitPreference] = useState<TransitPreference | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [destination, setDestination] = useState<SelectedPlace | null>(null);
    const [originPlace, setOriginPlace] = useState<SelectedPlace | null>(null);
    const [screenOpen, setScreenOpen] = useState(false);
    const [screenMode, setScreenMode] = useState<DirectionsResult["mode"]>("drive");
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [selectedMode, setSelectedMode] = useState<RouteMode | null>(null);
    const [weights, setWeights] = useState<PreferenceWeights>(DEFAULT_WEIGHTS);
    const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(loadLastLocation);
    const [initialCenter] = useState(userLocation);
    const mapRef = useRef<MapHandle>(null);

    const [restoredSession] = useState(() => loadNavSession());
    const nav = useNavigation(restoredSession);
    const { phase, isDemo, isTransit, exit, profile: navProfile } = nav;
    const { user } = useAuth();
    const [previewOption, setPreviewOption] = useState<RouteOption | null>(null);
    const tripIdRef = useRef<string | null>(restoredSession?.tripId ?? null);
    const [tripId, setTripId] = useState<string | null>(restoredSession?.tripId ?? null);
    const sessionRef = useRef(new TripSession());
    const activeKeyRef = useRef<string | undefined>(undefined);
    const operationRef = useRef(false);
    const cancelRequestedRef = useRef(false);
    const [plannedRoutes, setPlannedRoutes] = useState<{ key: string; routes: RouteOption[]; pointsError: string | null } | null>(null);
    const [receipt, setReceipt] = useState<{ earned: number; balance: number } | null>(null);
    const [completing, setCompleting] = useState(false);
    const [transitBuilding, setTransitBuilding] = useState(false);
    const [transitApproximate, setTransitApproximate] = useState(false);
    const [tripError, setTripError] = useState<string | null>(null);
    const navigating = nav.phase === "navigating";
    const arrived = nav.phase === "arrived";
    const navActive = navigating || arrived;

    const getMap = useCallback(() => mapRef.current?.getMap() ?? null, []);
    const { following, recenter } = useNavigationCamera({ getMap, active: navActive, position: nav.position });
    useWakeLock(navigating);

    useEffect(() => {
        if (restoredSession?.tripId) activeKeyRef.current = sessionRef.current.adopt(restoredSession.tripId);
    }, [restoredSession]);

    const { route: navRoute, destination: navDestination } = nav;
    const savedPhase = nav.phase === "navigating" || nav.phase === "arrived" ? nav.phase : null;
    useEffect(() => {
        if (!savedPhase || !navRoute || !navDestination) return;
        saveNavSession(
            {
                phase: savedPhase,
                profile: nav.profile,
                route: navRoute,
                destination: navDestination,
                stepIndex: nav.stepIndex,
                lastPosition: nav.position,
                isDemo: nav.isDemo,
                demoDistance: nav.demoDistance,
                muted: nav.muted,
                transit: nav.isTransit,
                tripId,
            },
            false,
        );
    });

    const originPoint = originPlace ?? userLocation;
    const origin = originPoint ? { lng: originPoint.longitude, lat: originPoint.latitude } : null;
    const destinationPoint = destination ? { lng: destination.longitude, lat: destination.latitude } : null;
    const { data, loading, error } = useRouteComparison(origin, destinationPoint);
    const routes = useMemo(() => data?.routes ?? NO_ROUTES, [data]);
    const transit = useTransitRoutes(origin, destinationPoint, optionsOpen);

    const planningKey = optionsOpen && user && origin && destinationPoint && routes.length
        ? JSON.stringify([origin, destinationPoint, routes]) : null;
    useEffect(() => {
        if (!planningKey) return;
        let active = true;
        const [from, to, options] = JSON.parse(planningKey) as [NonNullable<typeof origin>, NonNullable<typeof destinationPoint>, RouteOption[]];
        const session = sessionRef.current;
        void (async () => {
            await session.cancelExcept();
            if (!active) return;
            const results = await Promise.allSettled(options.map(async (option) => {
                await session.plan(from, to, option);
                const points = await session.points(option.routeId);
                return { ...option, tripPoints: pointsForMode(points, option.mode) };
            }));
            if (active) setPlannedRoutes({
                key: planningKey,
                routes: results.map((result, index) => result.status === "fulfilled" ? result.value : options[index]),
                pointsError: results.some((result) => result.status === "rejected")
                    ? "Account point estimates are unavailable for some routes. Showing route-based estimates." : null,
            });
        })().catch((e: unknown) => {
            if (active) setTripError(e instanceof Error ? e.message : "Couldn't plan your trip.");
        });
        return () => { active = false; };
    }, [planningKey]);

    const optionRoutes = plannedRoutes?.key === planningKey ? plannedRoutes.routes : null;

    const recommendedId = useMemo(() => recommendedRouteId(routes, weights), [routes, weights]);
    const selectedRouteId = routes.find((r) => r.mode === selectedMode)?.routeId ?? recommendedId;

    const handleUserLocation = (loc: UserLocationUpdate) => {
        const moved =
            !userLocation ||
            Math.abs(userLocation.longitude - loc.longitude) >= LOCATION_JITTER_DEG ||
            Math.abs(userLocation.latitude - loc.latitude) >= LOCATION_JITTER_DEG;
        if (moved) {
            const next = { longitude: loc.longitude, latitude: loc.latitude };
            setUserLocation(next);
            saveLastLocation(next);
        }
        nav.feedPosition({ lng: loc.longitude, lat: loc.latitude, heading: loc.heading });
    };

    const handlePlaceSelect = (place: SelectedPlace) => {
        void handleEndNavigation();
        setDestination(place);
        mapRef.current?.showPlace(place);
        setSelectedMode(null);
        setSheetOpen(false);
    };

    const handleScreenDone = (result: DirectionsResult) => {
        runViewTransition(() => {
            setOriginPlace(result.origin);
            setDestination(result.destination);
            setScreenMode(result.mode);
            setSelectedMode(TAB_TO_ROUTE_MODE[result.mode] ?? null);
            setScreenOpen(false);
            setSheetOpen(false);
        });
        if (result.destination) mapRef.current?.showPlace(result.destination);
        else mapRef.current?.clearPlace();
        if (["all", "bus", "metro", "train"].includes(result.mode)) {
            setTransitPreference(result.mode === "bus" ? "BUS" : result.mode === "metro" ? "SUBWAY" : result.mode === "train" ? "TRAIN" : "ALL");
        }
    };

    const handleStartTrip = async (route: RouteOption) => {
        if (!origin || !destinationPoint) return;
        setOptionsOpen(false);
        setPreviewOption(route);
        setSheetOpen(false);
        const result = await nav.preview(ROUTE_MODE_TO_PROFILE[route.mode], origin, destinationPoint);
        if (!result) return;
        mapRef.current?.fitToCoordinates(result.geometry.coordinates, PEEK_FIT_BOTTOM_PADDING);
    };

    const handleNavigateTransit = async (itinerary: TransitItinerary) => {
        if (!origin || !destinationPoint) return;
        setTripError(null);
        setPreviewOption(null);
        setTransitPreference(null);
        setOptionsOpen(false);
        setSheetOpen(false);
        void sessionRef.current.cancelExcept().catch(console.error);

        const name = destination?.name ?? "";
        let built = itineraryToRoute(itinerary, name);
        if (!built) {
            setTransitBuilding(true);
            try {
                let base;
                try {
                    base = await getRoute("driving", origin, destinationPoint);
                } catch {
                    base = await getRoute("walking", origin, destinationPoint);
                }
                built = itineraryToRoute(itinerary, name, base.geometry.coordinates);
            } catch {
                built = null;
            } finally {
                setTransitBuilding(false);
            }
        }
        if (!built) {
            setTripError("Couldn't build a path for this public transport route. Please try again.");
            return;
        }
        setTransitApproximate(built.approximate);
        setPreviewOption({
            ...transitTripOption(itinerary),
            geometry: built.route.geometry.coordinates,
        });
        nav.previewTransit(built.route, destinationPoint);
        mapRef.current?.fitToCoordinates(built.route.geometry.coordinates, PEEK_FIT_BOTTOM_PADDING);
    };

    const handleStartNavigation = async (demo: boolean) => {
        if (operationRef.current || nav.phase !== "previewing") return;
        operationRef.current = true;
        cancelRequestedRef.current = false;
        setTripError(null);
        setReceipt(null);
        try {
            if (demo) await sessionRef.current.cancelExcept();
            else if (user && previewOption) {
                if (origin && destinationPoint) {
                    await sessionRef.current.plan(origin, destinationPoint, previewOption);
                }
                tripIdRef.current = await sessionRef.current.start(previewOption.routeId);
                activeKeyRef.current = previewOption.routeId;
                setTripId(tripIdRef.current);
            }
            if (!cancelRequestedRef.current) nav.start({ demo });
        } catch (e) {
            setTripError(e instanceof Error ? e.message : "Couldn't start your trip. Try again.");
        } finally {
            operationRef.current = false;
            if (cancelRequestedRef.current) await handleEndNavigation();
        }
    };

    const handleTripComplete = useCallback(async () => {
        if (operationRef.current || cancelRequestedRef.current || phase !== "arrived") return;
        if (receipt || isDemo || !user) { setTripId(null); exit(); return; }
        const id = tripIdRef.current;
        if (!id) return;
        operationRef.current = true;
        setCompleting(true);
        setTripError(null);
        try {
            const trip = await completeTrip(id);
            sessionRef.current.complete(id);
            const profile = await getPointBalance();
            setReceipt({ earned: pointsForMode(trip.points, isTransit ? "TRANSIT" : previewOption?.mode ?? PROFILE_TO_ROUTE_MODE[navProfile]), balance: profile.totalPoints });
            window.dispatchEvent(new Event("points-updated"));
        } catch (e) {
            setTripError(e instanceof Error ? e.message : "Couldn't save your trip. Try again.");
        } finally {
            operationRef.current = false;
            setCompleting(false);
        }
    }, [phase, isDemo, isTransit, exit, navProfile, user, previewOption, receipt]);

    useEffect(() => {
        if (!(arrived && user && !nav.isDemo && !receipt && !tripError)) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) void handleTripComplete();
        });
        return () => {
            cancelled = true;
        };
    }, [arrived, user, nav.isDemo, nav.isTransit, receipt, tripError, handleTripComplete]);

    const handleEndNavigation = async () => {
        cancelRequestedRef.current = true;
        if (operationRef.current) return;
        operationRef.current = true;
        setTripError(null);
        try {
            await sessionRef.current.cancelExcept();
            tripIdRef.current = null;
            setTripId(null);
            activeKeyRef.current = undefined;
            setPlannedRoutes(null);
            setOptionsOpen(false);
            nav.exit();
        } catch (e) {
            setTripError(e instanceof Error ? e.message : "Couldn't cancel your trip. Try again.");
        } finally { operationRef.current = false; }
    };

    const navActiveRef = useRef(false);
    useEffect(() => {
        navActiveRef.current = navActive;
    }, [navActive]);
    useEffect(() => {
        const session = sessionRef.current;
        return () => {
            const keep = navActiveRef.current ? activeKeyRef.current : undefined;
            void session.cancelExcept(keep).catch(console.error);
        };
    }, []);

    const step = nav.steps[nav.stepIndex];
    const showPreview = nav.phase === "previewing" && nav.route !== null;
    const previewLoading = nav.loading || transitBuilding;

    return (
        <div className="relative h-full w-full overflow-hidden">
            <InteractiveMap
                ref={mapRef}
                initialCenter={initialCenter}
                onMapClick={() => setSheetOpen(false)}
                onUserLocation={handleUserLocation}
                routes={nav.phase === "idle" ? routes : NO_ROUTES}
                selectedRouteId={selectedRouteId}
                navRoute={nav.route?.geometry.coordinates ?? null}
            />

            {!navActive && <NavigationBar />}
            {tripError && !arrived && <div className="absolute top-36 left-4 right-4 z-[80]"><NavToast message={tripError} onRetry={() => void handleEndNavigation()} /></div>}

            {!navActive && (
                <DirectionsSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    originLabel={originPlace?.name ?? "Your location"}
                    destinationLabel={destination?.name ?? null}
                    onEditRoute={() => { void handleEndNavigation(); runViewTransition(() => setScreenOpen(true)); }}
                    editing={screenOpen}
                    onViewRoutes={() => { setTripError(null); setPlannedRoutes(null); setOptionsOpen(true); }}
                    onSelectMode={(mode) => {
                        setOptionsOpen(false);
                        setTransitPreference(mode === "bus" ? "BUS" : mode === "metro" ? "SUBWAY" : mode === "train" ? "TRAIN" : "ALL");
                    }}
                    preview={
                        showPreview && nav.route ? (
                            <DirectionsPreviewPanel
                                route={nav.route}
                                steps={nav.steps}
                                modeLabel={nav.isTransit ? (transitApproximate ? "Public transport · approximate path" : "Public transport") : PROFILE_LABEL[nav.profile]}
                                onStart={() => handleStartNavigation(false)}
                                onDemo={() => handleStartNavigation(true)}
                                onSelectStep={(s: DirectionsStep) => mapRef.current?.flyToPoint(s.maneuver.location, 17)}
                                onClose={() => void handleEndNavigation()}
                            />
                        ) : undefined
                    }
                />
            )}

            {!navActive && (
                <div className="absolute top-20 left-4 right-4 z-[55] flex md:right-auto md:top-[5.5rem] md:w-[400px]">
                    <MapSearchBox onSelectPlace={handlePlaceSelect} userLocation={userLocation} />
                </div>
            )}

            {!navActive && (previewLoading || nav.error) && (
                <div className="pointer-events-none absolute inset-x-0 top-36 z-40 px-4 md:inset-x-auto md:left-4 md:top-[10.5rem] md:w-[400px] md:px-0">
                    <NavToast
                        variant={previewLoading ? "info" : "error"}
                        message={previewLoading ? "Getting directions…" : (nav.error ?? "")}
                    />
                </div>
            )}

            {navigating && (
                <>
                    <NavBanner
                        step={step}
                        nextStep={nav.steps[nav.stepIndex + 1]}
                        afterNextStep={nav.steps[nav.stepIndex + 2]}
                        banner={nav.banner}
                        distanceToManeuver={nav.distanceToManeuver}
                        rerouting={nav.rerouting}
                        isDemo={nav.isDemo}
                    />
                    <div
                        className="pointer-events-none absolute inset-x-0 z-40 flex flex-col gap-2 px-3 md:inset-x-auto md:left-4 md:w-[27rem]"
                        style={{ top: "calc(env(safe-area-inset-top) + 9.5rem)" }}
                    >
                        {nav.rerouteError && <NavToast message={nav.rerouteError} onRetry={nav.retryReroute} />}
                        {nav.waitingForLocation && !nav.locationTimedOut && (
                            <NavToast variant="info" message="Waiting for your location…" />
                        )}
                        {nav.waitingForLocation && nav.locationTimedOut && (
                            <NavToast message="Can't get your location. Check location permission, or end the trip and try Demo drive." />
                        )}
                    </div>
                    {!following && (
                        <div
                            className={`pointer-events-none absolute right-3 z-40 ${
                                nav.isDemo
                                    ? "bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+14.5rem)] md:bottom-[14.5rem]"
                                    : "bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+10.5rem)] md:bottom-[10.5rem]"
                            }`}
                        >
                            <RecenterButton onClick={recenter} />
                        </div>
                    )}
                    <TripPanel
                        remainingDuration={nav.remainingDuration}
                        remainingDistance={nav.remainingDistance}
                        progress={nav.progress}
                        muted={nav.muted}
                        isDemo={nav.isDemo}
                        demoSpeed={nav.demoSpeed}
                        onToggleMute={nav.toggleMuted}
                        onSetDemoSpeed={nav.setDemoSpeed}
                        onEnd={handleEndNavigation}
                    />
                </>
            )}

            {arrived && nav.route && (
                <ArrivedCard
                    distanceMeters={nav.route.distance}
                    durationSeconds={nav.route.duration}
                    isDemo={nav.isDemo}
                    onComplete={() => void (cancelRequestedRef.current ? handleEndNavigation() : handleTripComplete())}
                    receipt={receipt}
                    busy={completing}
                    error={tripError}
                />
            )}

            {!navActive && optionsOpen && destination && (
                <RouteOptionsScreen
                    origin={origin}
                    destination={destinationPoint}
                    originLabel={originPlace?.name ?? "Your location"}
                    destinationName={destination.name}
                    routes={optionRoutes ?? routes}
                    recommendedRouteId={recommendedId}
                    selectedRouteId={selectedRouteId}
                    loading={loading || (!!user && !optionRoutes && !tripError)}
                    error={tripError ?? error}
                    pointsError={plannedRoutes?.key === planningKey ? plannedRoutes.pointsError : null}
                    weights={weights}
                    onWeightsChange={setWeights}
                    onSelectRoute={(id) => setSelectedMode(routes.find((r) => r.routeId === id)?.mode ?? null)}
                    onStartTrip={(route) => void handleStartTrip(route)}
                    onBack={() => void handleEndNavigation()}
                    onTransit={() => { void handleEndNavigation().then(() => setTransitPreference("ALL")); }}
                    transit={transit}
                    onNavigateTransit={(itinerary) => void handleNavigateTransit(itinerary)}
                />
            )}
            {!navActive && screenOpen && (
                <DirectionsScreen
                    initialMode={screenMode}
                    origin={originPlace}
                    destination={destination}
                    onDone={handleScreenDone}
                    near={userLocation}
                />
            )}
            {!navActive && transitPreference && <TransitScreen
                origin={origin}
                destination={destinationPoint}
                destinationName={destination?.name ?? ""}
                initialPreference={transitPreference}
                onNavigate={(itinerary) => void handleNavigateTransit(itinerary)}
                onBack={() => setTransitPreference(null)}
                onEditRoute={() => {
                    setScreenMode(transitPreference === "BUS" ? "bus" : transitPreference === "SUBWAY" ? "metro" : transitPreference === "TRAIN" ? "train" : "all");
                    setTransitPreference(null); setScreenOpen(true);
                }}
            />}
        </div>
    );
}

export default ExplorePage;
