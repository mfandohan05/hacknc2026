import { ArrowLeft, Bus, ChevronRight, Leaf } from "lucide-react";
import RouteComparison from "./RouteComparison";
import PreferenceSliders from "./PreferenceSliders";
import TransitCard from "./TransitCard";
import type { TransitItinerary } from "@/services/transitService";
import type { PreferenceWeights } from "@/lib/routeScoring";
import type { RouteOption } from "@/types/route";

type Props = {
    originLabel: string;
    destinationName: string;
    routes: RouteOption[];
    recommendedRouteId: string | null;
    selectedRouteId: string | null;
    loading: boolean;
    error: string | null;
    weights: PreferenceWeights;
    onWeightsChange: (weights: PreferenceWeights) => void;
    onSelectRoute: (routeId: string) => void;
    onStartTrip: (route: RouteOption) => void;
    onBack: () => void;
    // opens the public transport screen (full itineraries, preferences, departure time)
    onTransit: () => void;
    transit: { routes: TransitItinerary[]; loading: boolean; error: string | null };
};

// how many public transport itineraries are previewed in the options list
const TRANSIT_PREVIEW_COUNT = 2;

function RouteOptionsScreen({
    originLabel,
    destinationName,
    routes,
    recommendedRouteId,
    selectedRouteId,
    loading,
    error,
    weights,
    onWeightsChange,
    onSelectRoute,
    onStartTrip,
    onBack,
    onTransit,
    transit,
}: Props) {
    const selectedRoute = routes.find((r) => r.routeId === selectedRouteId) ?? null;

    const transitSection = (
        <section aria-label="Public transport" className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                    <Bus className="size-4" aria-hidden="true" />
                    Public transport
                </h2>
                <button
                    type="button"
                    onClick={onTransit}
                    className="flex min-h-11 items-center gap-1 text-sm font-semibold text-[#17334A] hover:underline"
                >
                    More options
                    <ChevronRight className="size-4" aria-hidden="true" />
                </button>
            </div>

            {transit.loading && (
                <div className="h-24 animate-pulse rounded-2xl bg-white/60" aria-busy="true" aria-label="Loading public transport" />
            )}
            {!transit.loading && transit.error && <Note>{transit.error}</Note>}
            {!transit.loading && !transit.error && transit.routes.length === 0 && (
                <Note>No public transport found for this trip right now.</Note>
            )}
            {transit.routes.slice(0, TRANSIT_PREVIEW_COUNT).map((itinerary) => (
                <TransitCard key={itinerary.id} itinerary={itinerary} onSelect={onTransit} />
            ))}
            <p className="px-1 text-xs text-[#17334A]/75">Public transport trips don't earn EcoPoints.</p>
        </section>
    );

    return (
        <div className="aero-bg fixed inset-0 z-[60] flex flex-col overflow-hidden text-[#17334A] md:inset-auto md:bottom-4 md:left-4 md:top-4 md:w-[400px] md:rounded-3xl md:border md:border-[#0c263c]/55 md:shadow-2xl">
            <header className="aero-glass relative flex items-center gap-3 rounded-b-3xl px-3 pb-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back"
                    className="aero-orb flex size-11 shrink-0 items-center justify-center rounded-full"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate">
                        <span className="text-[#17334A]/70">from </span>
                        <span className="font-semibold">{originLabel}</span>
                    </p>
                    <p className="truncate">
                        <span className="text-[#17334A]/70">to </span>
                        <span className="font-semibold">{destinationName}</span>
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
                <div className="mx-auto flex max-w-md flex-col gap-3">
                    <h1 className="px-1 text-xl font-semibold drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                        How do you want to go?
                    </h1>

                    {loading && (
                        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading routes">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/60" />
                            ))}
                        </div>
                    )}

                    {!loading && error && <Note>{error}</Note>}

                    {!loading && !error && routes.length === 0 && (
                        <Note>
                            {originLabel === "Your location"
                                ? "Waiting for your location. Allow location access to see routes."
                                : "No routes found."}
                        </Note>
                    )}

                    {routes.length === 0 && transitSection}

                    {routes.length > 0 && (
                        <>
                            <RouteComparison
                                routes={routes}
                                recommendedRouteId={recommendedRouteId}
                                selectedRouteId={selectedRouteId}
                                onSelect={onSelectRoute}
                            />
                            {transitSection}
                            <PreferenceSliders value={weights} onChange={onWeightsChange} />
                            <button
                                type="button"
                                disabled={!selectedRoute}
                                onClick={() => selectedRoute && onStartTrip(selectedRoute)}
                                className="aero-gel h-12 w-full rounded-full text-base font-semibold disabled:opacity-50"
                            >
                                Start trip
                            </button>
                            <p className="text-center text-xs text-[#17334A]/75">
                                Eco points are earned for walking and biking, based on distance traveled.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Note({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-5 text-center text-sm font-medium">
            <span className="aero-gel flex size-10 items-center justify-center rounded-full">
                <Leaf className="size-5" />
            </span>
            {children}
        </div>
    );
}

export default RouteOptionsScreen;
