import { useMemo, useState } from "react";
import NavigationBar from "../NavigationBar";
import MapSearchBox from "../MapSearchBox";
import type { SearchResult } from "../MapSearchBox";
import InteractiveMap from "../InteractiveMap";
import DirectionsSheet from "../DirectionsSheet";
import DirectionsScreen from "../DirectionsScreen";
import type { DirectionsResult } from "../DirectionsScreen";
import { useRouteComparison } from "@/hooks/useRouteComparison";
import { useUserLocation } from "@/hooks/useUserLocation";
import { DEFAULT_WEIGHTS, recommendedRouteId } from "@/lib/routeScoring";
import type { PreferenceWeights } from "@/lib/routeScoring";
import type { RouteMode, RouteOption } from "@/types/route";

const TAB_TO_ROUTE_MODE: Partial<Record<DirectionsResult["mode"], RouteMode>> = {
    drive: "CAR",
    walk: "WALK",
    bike: "BIKE",
};

function ExplorePage() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [destination, setDestination] = useState<SearchResult | null>(null);
    // null means the user's current location
    const [originPlace, setOriginPlace] = useState<SearchResult | null>(null);
    const [screenOpen, setScreenOpen] = useState(false);
    const [screenMode, setScreenMode] = useState<DirectionsResult["mode"]>("drive");
    const [selectedMode, setSelectedMode] = useState<RouteMode | null>(null);
    const [weights, setWeights] = useState<PreferenceWeights>(DEFAULT_WEIGHTS);

    const userLocation = useUserLocation();
    const origin = originPlace ?? userLocation;
    const { data, loading, error } = useRouteComparison(origin, destination);
    const routes = useMemo(() => data?.routes ?? [], [data]);

    // recommendation re-ranks live as the sliders move
    const recommendedId = useMemo(() => recommendedRouteId(routes, weights), [routes, weights]);
    const selectedRouteId =
        routes.find((r) => r.mode === selectedMode)?.routeId ?? recommendedId;

    const handlePlaceSelect = (place: SearchResult) => {
        setDestination(place);
        setSelectedMode(null);
        setSheetOpen(true);
    };

    const handleScreenDone = (result: DirectionsResult) => {
        setOriginPlace(result.origin);
        setDestination(result.destination);
        setScreenMode(result.mode);
        setSelectedMode(TAB_TO_ROUTE_MODE[result.mode] ?? null);
        setScreenOpen(false);
        if (result.destination) setSheetOpen(true);
    };

    const handleStartTrip = (route: RouteOption) => {
        // TODO: call the backend (e.g. POST /api/v1/routes/start) once it exists
        console.info("Start trip", route.routeId);
    };

    return (
        <div className="relative h-screen w-full overflow-hidden">
            <InteractiveMap
                onMapClick={() => setSheetOpen(false)}
                target={destination}
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
                routes={routes}
                recommendedRouteId={recommendedId}
                selectedRouteId={selectedRouteId}
                loading={loading}
                error={error}
                weights={weights}
                onWeightsChange={setWeights}
                onSelectRoute={(id) => setSelectedMode(routes.find((r) => r.routeId === id)?.mode ?? null)}
                onStartTrip={handleStartTrip}
            />
            <div className="absolute top-20 left-4 right-4 z-40 flex">
                <MapSearchBox onSelect={handlePlaceSelect} />
            </div>
            {screenOpen && (
                <DirectionsScreen
                    initialMode={screenMode}
                    origin={originPlace}
                    destination={destination}
                    onDone={handleScreenDone}
                />
            )}
        </div>
    );
}

export default ExplorePage;
