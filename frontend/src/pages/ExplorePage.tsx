import { useMemo, useRef, useState } from "react";
import NavigationBar from "../NavigationBar";
import MapSearchBox from "@/components/MapSearchBox";
import InteractiveMap from "../InteractiveMap";
import type { MapHandle } from "../InteractiveMap";
import DirectionsSheet from "../DirectionsSheet";
import DirectionsScreen from "../DirectionsScreen";
import RouteOptionsScreen from "@/components/routes/RouteOptionsScreen";
import RouteDetailsScreen from "@/components/routes/RouteDetailsScreen";
import type { DirectionsResult } from "../DirectionsScreen";
import { useRouteComparison } from "@/hooks/useRouteComparison";
import { DEFAULT_WEIGHTS, recommendedRouteId } from "@/lib/routeScoring";
import type { PreferenceWeights } from "@/lib/routeScoring";
import type { SelectedPlace } from "@/services/searchService";
import type { RouteMode, RouteOption } from "@/types/route";

// ignore GPS updates smaller than this (about 50 m) so route requests are not refired by jitter
const LOCATION_JITTER_DEG = 0.0005;

const TAB_TO_ROUTE_MODE: Partial<Record<DirectionsResult["mode"], RouteMode>> = {
    drive: "CAR",
    walk: "WALK",
    bike: "BIKE",
};

function ExplorePage() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [destination, setDestination] = useState<SelectedPlace | null>(null);
    const [originPlace, setOriginPlace] = useState<SelectedPlace | null>(null);
    const [screenOpen, setScreenOpen] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [screenMode, setScreenMode] = useState<DirectionsResult["mode"]>("drive");
    const [selectedMode, setSelectedMode] = useState<RouteMode | null>(null);
    const [weights, setWeights] = useState<PreferenceWeights>(DEFAULT_WEIGHTS);

    const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(null);
    const mapRef = useRef<MapHandle>(null);

    const originPoint = originPlace ?? userLocation;
    const origin = originPoint ? { lng: originPoint.longitude, lat: originPoint.latitude } : null;
    const destinationPoint = destination ? { lng: destination.longitude, lat: destination.latitude } : null;
    const { data, loading, error } = useRouteComparison(origin, destinationPoint);
    const routes = useMemo(() => data?.routes ?? [], [data]);

    const recommendedId = useMemo(() => recommendedRouteId(routes, weights), [routes, weights]);
    const selectedRouteId =
        routes.find((r) => r.mode === selectedMode)?.routeId ?? recommendedId;

    const handleUserLocation = (loc: { longitude: number; latitude: number }) => {
        setUserLocation((prev) =>
            prev &&
            Math.abs(prev.longitude - loc.longitude) < LOCATION_JITTER_DEG &&
            Math.abs(prev.latitude - loc.latitude) < LOCATION_JITTER_DEG
                ? prev
                : loc,
        );
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

    const selectedRoute = routes.find((r) => r.routeId === selectedRouteId) ?? null;

    const handleStartTrip = (route: RouteOption) => {
        // TODO: call the backend (e.g. POST /api/v1/routes/start) once it exists
        console.info("Start trip", route.routeId);
        setDetailsOpen(true);
    };

    return (
        <div className="relative h-screen w-full overflow-hidden">
            <InteractiveMap
                onMapClick={() => setSheetOpen(false)}
                ref={mapRef}
                onUserLocation={handleUserLocation}
                routes={routes}
                selectedRouteId={selectedRouteId}
            />
            <NavigationBar />
            <DirectionsSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                originLabel={originPlace?.name ?? "Your location"}
                destinationLabel={destination?.name ?? null}
                onEditRoute={() => setScreenOpen(true)}
                onViewRoutes={() => setOptionsOpen(true)}
            />
            <div className="absolute top-20 left-4 right-4 z-40 flex">
                <MapSearchBox onSelectPlace={handlePlaceSelect} userLocation={userLocation} />
            </div>
            {optionsOpen && destination && (
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
                    onStartTrip={handleStartTrip}
                    onBack={() => setOptionsOpen(false)}
                />
            )}
            {detailsOpen && selectedRoute && destination && (
                <RouteDetailsScreen
                    route={selectedRoute}
                    originLabel={originPlace?.name ?? "Your location"}
                    destinationName={destination.name}
                    destinationAddress={destination.address}
                    recommended={selectedRoute.routeId === recommendedId}
                    onBack={() => setDetailsOpen(false)}
                />
            )}
            {screenOpen && (
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
