import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavigationBar from "../NavigationBar";
import MapSearchBox from "@/components/MapSearchBox";
import InteractiveMap from "../InteractiveMap";
import type { MapHandle, UserLocationUpdate } from "../InteractiveMap";
import DirectionsSheet from "../DirectionsSheet";
import DirectionsScreen from "../DirectionsScreen";
import type { DirectionsResult } from "../DirectionsScreen";
import RouteOptionsScreen from "@/components/routes/RouteOptionsScreen";
import DirectionsPreviewPanel from "@/components/navigation/DirectionsPreviewPanel";
import NavBanner from "@/components/navigation/NavBanner";
import TripPanel from "@/components/navigation/TripPanel";
import ArrivedCard from "@/components/navigation/ArrivedCard";
import NavToast from "@/components/navigation/NavToast";
import RecenterButton from "@/components/navigation/RecenterButton";
import { useNavigation } from "@/hooks/useNavigation";
import { useNavigationCamera } from "@/hooks/useNavigationCamera";
import { useRouteComparison } from "@/hooks/useRouteComparison";
import { useWakeLock } from "@/hooks/useWakeLock";
import { DEFAULT_WEIGHTS, recommendedRouteId } from "@/lib/routeScoring";
import type { PreferenceWeights } from "@/lib/routeScoring";
import type { SelectedPlace } from "@/services/searchService";
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

// ignore GPS updates smaller than this (about 50 m) so route requests are not refired by jitter
const LOCATION_JITTER_DEG = 0.0005;

const NO_ROUTES: RouteOption[] = [];

function ExplorePage() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [destination, setDestination] = useState<SelectedPlace | null>(null);
    // null means the user's current location
    const [originPlace, setOriginPlace] = useState<SelectedPlace | null>(null);
    const [screenOpen, setScreenOpen] = useState(false);
    const [screenMode, setScreenMode] = useState<DirectionsResult["mode"]>("drive");
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [selectedMode, setSelectedMode] = useState<RouteMode | null>(null);
    const [weights, setWeights] = useState<PreferenceWeights>(DEFAULT_WEIGHTS);
    const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(null);
    const mapRef = useRef<MapHandle>(null);

    const nav = useNavigation();
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
        setUserLocation((prev) =>
            prev &&
            Math.abs(prev.longitude - loc.longitude) < LOCATION_JITTER_DEG &&
            Math.abs(prev.latitude - loc.latitude) < LOCATION_JITTER_DEG
                ? prev
                : { longitude: loc.longitude, latitude: loc.latitude },
        );
        nav.feedPosition({ lng: loc.longitude, lat: loc.latitude, heading: loc.heading });
    };

    const handlePlaceSelect = (place: SelectedPlace) => {
        setDestination(place);
        mapRef.current?.showPlace(place);
        setSelectedMode(null);
        setSheetOpen(true);
    };

    const handleScreenDone = (result: DirectionsResult) => {
        setOriginPlace(result.origin);
        setDestination(result.destination);
        if (result.destination) mapRef.current?.showPlace(result.destination);
        else mapRef.current?.clearPlace();
        setScreenMode(result.mode);
        setSelectedMode(TAB_TO_ROUTE_MODE[result.mode] ?? null);
        setScreenOpen(false);
        if (result.destination) setSheetOpen(true);
    };

    // from the options page: load the turn-by-turn route and preview it in the drawer
    const handleStartTrip = async (route: RouteOption) => {
        if (!origin || !destinationPoint) return;
        setOptionsOpen(false);
        setSheetOpen(true);
        const result = await nav.preview(ROUTE_MODE_TO_PROFILE[route.mode], origin, destinationPoint);
        if (result) mapRef.current?.fitToCoordinates(result.geometry.coordinates);
    };

    const handleTripComplete = (trip: { isDemo: boolean }) => {
        if (!trip.isDemo) {
            // TODO: submit the completed trip to the backend. Demo trips are never submitted,
            // so they cannot count toward verified rankings.
        }
        nav.exit();
    };

    const step = nav.steps[nav.stepIndex];
    const showPreview = nav.phase === "previewing" && nav.route !== null;
    const previewLoading = nav.loading;

    return (
        <div className="relative h-screen w-full overflow-hidden">
            <InteractiveMap
                ref={mapRef}
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
                    onEditRoute={() => setScreenOpen(true)}
                    onViewRoutes={() => setOptionsOpen(true)}
                    preview={
                        showPreview && nav.route ? (
                            <DirectionsPreviewPanel
                                route={nav.route}
                                steps={nav.steps}
                                modeLabel={PROFILE_LABEL[nav.profile]}
                                onStart={() => nav.start({ demo: false })}
                                onDemo={() => nav.start({ demo: true })}
                                onSelectStep={(s: DirectionsStep) => mapRef.current?.flyToPoint(s.maneuver.location, 17)}
                                onClose={nav.exit}
                            />
                        ) : undefined
                    }
                />
            )}

            {!navActive && (
                <div className="absolute top-20 left-4 right-4 z-40 flex">
                    <MapSearchBox onSelectPlace={handlePlaceSelect} userLocation={userLocation} />
                </div>
            )}

            {!navActive && (previewLoading || nav.error) && (
                <div className="pointer-events-none absolute inset-x-0 top-36 z-40 px-4">
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
                        className="pointer-events-none absolute inset-x-0 z-40 flex flex-col gap-2 px-3"
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
                        onEnd={nav.exit}
                    />
                </>
            )}

            {arrived && nav.route && (
                <ArrivedCard
                    distanceMeters={nav.route.distance}
                    durationSeconds={nav.route.duration}
                    isDemo={nav.isDemo}
                    onComplete={() => handleTripComplete({ isDemo: nav.isDemo })}
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
        </div>
    );
}

export default ExplorePage;
