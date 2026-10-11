import { useEffect, useState } from "react";
import { ArrowLeft, Bus, Footprints, Loader2, Navigation } from "lucide-react";
import { ApiError } from "@/services/api";
import { formatDistance } from "@/lib/formatRoute";
import { getTransitRoutes } from "@/services/transitService";
import type { TransitItinerary, TransitPreference, TransitResponse } from "@/services/transitService";
import type { LngLat } from "@/types/route";

type Props = {
    origin: LngLat | null;
    destination: LngLat | null;
    destinationName: string;
    initialPreference: TransitPreference;
    onBack: () => void;
    onEditRoute: () => void;
    // starts turn-by-turn navigation along an itinerary
    onNavigate: (itinerary: TransitItinerary) => void;
};

function time(value: string | null) {
    return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

export default function TransitScreen({ origin, destination, destinationName, initialPreference, onBack, onEditRoute, onNavigate }: Props) {
    const [preference, setPreference] = useState(initialPreference);
    const [departure, setDeparture] = useState("");
    const [queryDeparture, setQueryDeparture] = useState<string | undefined>();
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<TransitResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const originLat = origin?.lat;
    const originLng = origin?.lng;
    const destinationLat = destination?.lat;
    const destinationLng = destination?.lng;

    useEffect(() => {
        if (originLat === undefined || originLng === undefined || destinationLat === undefined || destinationLng === undefined) return;
        const abort = new AbortController();
        void getTransitRoutes({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng },
            preference, queryDeparture, abort.signal)
            .then((data) => { if (!abort.signal.aborted) setResult(data); })
            .catch((cause: unknown) => {
                if (abort.signal.aborted) return;
                setError(cause instanceof ApiError && cause.status === 503
                    ? "Public transport is unavailable right now. Try again later."
                    : "Couldn't load public transport routes. Please try again.");
            }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
        return () => abort.abort();
    }, [originLat, originLng, destinationLat, destinationLng, preference, queryDeparture, attempt]);

    const ready = origin && destination;
    const mapParams = ready ? new URLSearchParams({
        origin: `${origin.lat},${origin.lng}`, destination: `${destination.lat},${destination.lng}`, mode: "transit",
    }) : null;
    const embedKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;
    const embedUrl = mapParams && embedKey
        ? `https://www.google.com/maps/embed/v1/directions?${mapParams}&key=${encodeURIComponent(embedKey)}` : null;

    const card = "rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_4px_14px_rgba(23,51,74,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md";
    const field = "aero-input mt-1 h-11 w-full rounded-xl px-3 text-base text-[#17334A] outline-none";

    return (
        <section
            className="aero-bg fixed inset-0 z-[80] flex flex-col overflow-hidden text-[#17334A] md:absolute md:inset-auto md:bottom-4 md:left-4 md:top-4 md:w-[400px] md:rounded-3xl md:border md:border-[#0c263c]/55 md:shadow-2xl"
            aria-label="Public transport"
        >
            <header className="aero-glass relative flex items-center gap-3 rounded-b-3xl px-3 pb-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back"
                    className="aero-orb flex size-11 shrink-0 items-center justify-center rounded-full"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-semibold leading-tight">Public transport</h1>
                    <p className="truncate text-sm text-[#17334A]/80">{destinationName || "Choose a destination"}</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
                <div className="mx-auto flex max-w-md flex-col gap-4">
                    {!ready ? (
                        <div className={card}>
                            <p>Choose a starting point and destination to find buses and trains.</p>
                            <button className="aero-gel mt-3 h-11 rounded-full px-5 font-semibold" onClick={onEditRoute}>
                                Choose locations
                            </button>
                        </div>
                    ) : (
                        <>
                            <form
                                className={`${card} space-y-3`}
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    setResult(null);
                                    setError(null);
                                    setLoading(true);
                                    setQueryDeparture(departure ? new Date(departure).toISOString() : undefined);
                                    setAttempt((value) => value + 1);
                                }}
                            >
                                <label className="block text-sm font-semibold">
                                    Prefer
                                    <select
                                        className={field}
                                        value={preference}
                                        onChange={(event) => {
                                            setLoading(true);
                                            setError(null);
                                            setResult(null);
                                            setPreference(event.target.value as TransitPreference);
                                        }}
                                    >
                                        <option value="ALL">All public transport</option>
                                        <option value="BUS">Bus</option>
                                        <option value="SUBWAY">Metro / subway</option>
                                        <option value="TRAIN">Train</option>
                                    </select>
                                </label>
                                <label className="block text-sm font-semibold">
                                    Leave at <span className="font-normal text-[#17334A]/75">(your local time; blank means now)</span>
                                    <input
                                        type="datetime-local"
                                        className={field}
                                        value={departure}
                                        onChange={(event) => setDeparture(event.target.value)}
                                    />
                                </label>
                                <button
                                    className="aero-gel h-11 w-full rounded-full text-base font-semibold disabled:opacity-60"
                                    type="submit"
                                    disabled={loading}
                                >
                                    Find transit routes
                                </button>
                            </form>

                            {loading && (
                                <p role="status" className="flex items-center gap-2 px-1 text-sm font-medium">
                                    <Loader2 className="size-4 animate-spin" />
                                    Finding public transport…
                                </p>
                            )}
                            {error && (
                                <p role="alert" className={`${card} text-sm font-medium`}>
                                    {error}
                                </p>
                            )}
                            {!loading && !error && result?.routes.length === 0 && (
                                <p className={`${card} text-sm`}>
                                    No public transport was found for this time and route. Try a different departure time.
                                </p>
                            )}

                            {result?.routes.map((route, index) => (
                                <article key={route.id} className={`${card} space-y-3`}>
                                    <h2 className="text-lg font-semibold">
                                        Option {index + 1} · {Math.ceil(route.durationSeconds / 60)} min
                                    </h2>
                                    <p className="text-sm text-[#17334A]/85">
                                        {formatDistance(route.distanceMeters / 1000)} · {route.transfers} transfers ·{" "}
                                        {route.fare !== null && route.currency
                                            ? new Intl.NumberFormat(undefined, { style: "currency", currency: route.currency }).format(route.fare)
                                            : "Fare unavailable"}
                                    </p>
                                    <ol className="space-y-3">
                                        {route.steps.map((step, stepIndex) => (
                                            <li key={stepIndex} className="flex gap-3 border-t border-[#17334A]/15 pt-3">
                                                <span
                                                    className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                                                        step.mode === "TRANSIT" ? "aero-blue" : "aero-orb"
                                                    }`}
                                                >
                                                    {step.mode === "TRANSIT" ? <Bus className="size-4" /> : <Footprints className="size-4" />}
                                                </span>
                                                <div className="min-w-0 text-sm">
                                                    <p className="font-semibold">
                                                        {step.line
                                                            ? `${step.line}${step.headsign ? ` toward ${step.headsign}` : ""}`
                                                            : step.instruction || "Walk to the next stop"}
                                                    </p>
                                                    {step.departureStop && (
                                                        <p>
                                                            {step.departureStop} → {step.arrivalStop}
                                                        </p>
                                                    )}
                                                    {step.departureTime && (
                                                        <p>
                                                            {time(step.departureTime)} – {time(step.arrivalTime)}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-[#17334A]/70">
                                                        {Math.ceil(step.durationSeconds / 60)} min · {formatDistance(step.distanceMeters / 1000)}
                                                        {step.agencies.length > 0 ? ` · ${step.agencies.join(", ")}` : ""}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                    <button
                                        type="button"
                                        onClick={() => onNavigate(route)}
                                        className="aero-gel flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
                                    >
                                        <Navigation className="size-4" aria-hidden="true" />
                                        Navigate this route
                                    </button>
                                </article>
                            ))}

                            {embedUrl && (
                                <iframe
                                    title="Google Maps transit directions"
                                    src={embedUrl}
                                    className="h-[300px] w-full rounded-2xl border border-white/80"
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            )}

                            <p className="px-1 text-xs text-[#17334A]/80">
                                Schedules and fares may change. Preferences may include other transport modes. Transit trips
                                currently do not award EcoPoints.
                            </p>
                            <p className="px-1 text-xs text-[#17334A]/80">
                                Route information from{" "}
                                <a className="font-semibold underline" href="https://maps.google.com" target="_blank" rel="noreferrer">
                                    Google Maps
                                </a>
                                .
                            </p>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
