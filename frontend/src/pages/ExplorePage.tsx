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
import type { TransitPreference } from "@/services/transitService";
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
import { DEFAULT_WEIGHTS, recommendedRouteId } from "@/lib/routeScoring";
import type { PreferenceWeights } from "@/lib/routeScoring";
import type { SelectedPlace } from "@/services/searchService";
import { cancelTrip, completeTrip, startTrip } from "@/services/tripService";
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
    // the map is recreated on every visit to this tab, so it starts from the last known location
    const [initialCenter] = useState(userLocation);
    const mapRef = useRef<MapHandle>(null);

    const nav = useNavigation();
    const { user } = useAuth();
    // the option the user picked on the comparison page; its estimates are saved with the trip
    const [previewOption, setPreviewOption] = useState<RouteOption | null>(null);
    // resolves to the server trip id once /trips/start returns (null for guests, demos and failures)
    const tripIdRef = useRef<Promise<string | null> | null>(null);
    const [completing, setCompleting] = useState(false);
    const [tripError, setTripError] = useState<string | null>(null);
    const navigating = nav.phase === "navigating";
    const arrived = nav.phase === "arrived";
    const navActive = navigating || arrived;

    const getMap = useCallback(() => mapRef.current?.getMap() ?? null, []);
    const { following, recenter } = useNavigationCamera({ getMap, active: navActive, position: nav.position });
    useWakeLock(navigating);

    // lets the app shell slide the bottom tab bar away while navigating
    useEffect(() => {
        if (!navActive) return;
        document.documentElement.dataset.navigating = "true";
        return () => {
            delete document.documentElement.dataset.navigating;
        };
    }, [navActive]);

    const originPoint = originPlace ?? userLocation;
    const origin = originPoint ? { lng: originPoint.longitude, lat: originPoint.latitude } : null;
    const destinationPoint = destination ? { lng: destination.longitude, lat: destination.latitude } : null;
    const { data, loading, error } = useRouteComparison(origin, destinationPoint);
    const routes = useMemo(() => data?.routes ?? NO_ROUTES, [data]);

    // recommendation re-ranks live as the sliders move
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
        setDestination(place);
        mapRef.current?.showPlace(place);
        setSelectedMode(null);
        // stays down at its peek (showing the destination and "See routes") so it never covers the route on the map
        setSheetOpen(false);
    };

    const handleScreenDone = (result: DirectionsResult) => {
        // the header morphs back into the drawer's summary row
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
        // collapse the drawer to its peek right away, so the preview content never pushes it upward
        setSheetOpen(false);
        const result = await nav.preview(ROUTE_MODE_TO_PROFILE[route.mode], origin, destinationPoint);
        if (!result) return;
        mapRef.current?.fitToCoordinates(result.geometry.coordinates, PEEK_FIT_BOTTOM_PADDING);
    };

    // Real trips are recorded on the backend when signed in. Demo trips never touch it, so they
    // cannot count toward verified rankings.
    const handleStartNavigation = (demo: boolean) => {
        nav.start({ demo });
        setTripError(null);
        tripIdRef.current = null;
        if (demo || !user || !previewOption || !nav.route || !origin || !destinationPoint) return;
        tripIdRef.current = startTrip(origin, destinationPoint, previewOption, nav.route)
            .then((trip) => trip.id)
            .catch((e: unknown) => {
                console.error("Could not start the trip on the server", e);
                return null;
            });
    };

    const handleTripComplete = async (trip: { isDemo: boolean }) => {
        const pending = tripIdRef.current;
        if (!trip.isDemo && pending) {
            setCompleting(true);
            setTripError(null);
            try {
                const id = await pending;
                if (id) await completeTrip(id);
            } catch (e) {
                setTripError(e instanceof Error ? e.message : "Couldn't save your trip. Try again.");
                setCompleting(false);
                return;
            }
            setCompleting(false);
        }
        tripIdRef.current = null;
        nav.exit();
    };

    const handleEndNavigation = () => {
        const pending = tripIdRef.current;
        tripIdRef.current = null;
        nav.exit();
        // best effort: mark the server trip cancelled
        if (pending) void pending.then((id) => (id ? cancelTrip(id) : undefined)).catch(() => undefined);
    };

    const step = nav.steps[nav.stepIndex];
    const showPreview = nav.phase === "previewing" && nav.route !== null;
    const previewLoading = nav.loading;

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

            {!navActive && (
                <DirectionsSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    originLabel={originPlace?.name ?? "Your location"}
                    destinationLabel={destination?.name ?? null}
                    onEditRoute={() => runViewTransition(() => setScreenOpen(true))}
                    editing={screenOpen}
                    onViewRoutes={() => setOptionsOpen(true)}
                    onSelectMode={(mode) => {
                        setOptionsOpen(false);
                        setTransitPreference(mode === "bus" ? "BUS" : mode === "metro" ? "SUBWAY" : mode === "train" ? "TRAIN" : "ALL");
                    }}
                    preview={
                        showPreview && nav.route ? (
                            <DirectionsPreviewPanel
                                route={nav.route}
                                steps={nav.steps}
                                modeLabel={PROFILE_LABEL[nav.profile]}
                                onStart={() => handleStartNavigation(false)}
                                onDemo={() => handleStartNavigation(true)}
                                onSelectStep={(s: DirectionsStep) => mapRef.current?.flyToPoint(s.maneuver.location, 17)}
                                onClose={nav.exit}
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
                            className="pointer-events-none absolute right-3 z-40"
                            style={{
                                bottom: `calc(env(safe-area-inset-bottom) + ${nav.isDemo ? "14.5rem" : "10.5rem"})`,
                            }}
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
                    onComplete={() => void handleTripComplete({ isDemo: nav.isDemo })}
                    busy={completing}
                    error={tripError}
                />
            )}

            {!navActive && optionsOpen && destination && (
                <RouteOptionsScreen
                    originLabel={originPlace?.name ?? "Your location"}
                    destinationName={destination.name}
                    routes={routes}
                    recommendedRouteId={recommendedId}
                    selectedRouteId={selectedRouteId}
                    loading={loading}
                    error={error}
                    weights={weights}
                    onWeightsChange={setWeights}
                    onSelectRoute={(id) => setSelectedMode(routes.find((r) => r.routeId === id)?.mode ?? null)}
                    onStartTrip={(route) => void handleStartTrip(route)}
                    onBack={() => setOptionsOpen(false)}
                    onTransit={() => { setOptionsOpen(false); setTransitPreference("ALL"); }}
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
