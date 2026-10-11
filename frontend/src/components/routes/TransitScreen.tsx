import { useEffect, useState } from "react";
import { ArrowLeft, Bus, ExternalLink, Footprints, Loader2 } from "lucide-react";
import { ApiError } from "@/services/api";
import { getTransitRoutes } from "@/services/transitService";
import type { TransitPreference, TransitResponse } from "@/services/transitService";
import type { LngLat } from "@/types/route";

type Props = {
    origin: LngLat | null;
    destination: LngLat | null;
    destinationName: string;
    initialPreference: TransitPreference;
    onBack: () => void;
    onEditRoute: () => void;
};

function time(value: string | null) {
    return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

export default function TransitScreen({ origin, destination, destinationName, initialPreference, onBack, onEditRoute }: Props) {
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
    const externalUrl = ready ? `https://www.google.com/maps/dir/?${new URLSearchParams({
        api: "1", origin: `${origin.lat},${origin.lng}`, destination: `${destination.lat},${destination.lng}`, travelmode: "transit",
    })}` : null;

    return (
        <section className="fixed inset-0 z-[80] overflow-y-auto bg-[#e8f6fc] text-[#17334A]" aria-label="Public transport">
            <header className="sticky top-0 z-10 flex items-center gap-3 bg-white p-4 shadow-sm">
                <button type="button" onClick={onBack} aria-label="Back to map" className="aero-orb rounded-full p-3"><ArrowLeft /></button>
                <div><h1 className="text-xl font-semibold">Public transport</h1><p className="text-sm">{destinationName || "Choose a destination"}</p></div>
            </header>
            <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-2">
                <div className="space-y-4">
                    {!ready ? (
                        <div className="rounded-2xl bg-white p-5">
                            <p>Choose a starting point and destination to find buses and trains.</p>
                            <button className="aero-gel mt-3 rounded-full px-5 py-3" onClick={onEditRoute}>Choose locations</button>
                        </div>
                    ) : <>
                        <form className="space-y-3 rounded-2xl bg-white p-4" onSubmit={(event) => {
                            event.preventDefault();
                            setResult(null); setError(null); setLoading(true);
                            setQueryDeparture(departure ? new Date(departure).toISOString() : undefined);
                            setAttempt((value) => value + 1);
                        }}>
                            <label className="block">Prefer
                                <select className="mt-1 w-full rounded-xl border p-2" value={preference} onChange={(event) => {
                                    setLoading(true); setError(null); setResult(null);
                                    setPreference(event.target.value as TransitPreference);
                                }}>
                                    <option value="ALL">All public transport</option><option value="BUS">Bus</option>
                                    <option value="SUBWAY">Metro / subway</option><option value="TRAIN">Train</option>
                                </select>
                            </label>
                            <label className="block">Leave at (your local time; blank means now)
                                <input type="datetime-local" className="mt-1 w-full rounded-xl border p-2" value={departure} onChange={(event) => setDeparture(event.target.value)} />
                            </label>
                            <button className="aero-gel rounded-full px-5 py-2" type="submit" disabled={loading}>Find transit routes</button>
                        </form>
                        {loading && <p role="status" className="flex items-center gap-2"><Loader2 className="animate-spin" />Finding public transport…</p>}
                        {error && <p role="alert" className="rounded-xl bg-white p-4">{error}</p>}
                        {!loading && !error && result?.routes.length === 0 && <p>No public transport was found for this time and route. Try a different departure time.</p>}
                        {result?.routes.map((route, index) => (
                            <article key={route.id} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                                <h2 className="text-lg font-semibold">Option {index + 1} · {Math.ceil(route.durationSeconds / 60)} min</h2>
                                <p className="text-sm">{(route.distanceMeters / 1000).toFixed(1)} km · {route.transfers} transfers · {route.fare !== null && route.currency
                                    ? new Intl.NumberFormat(undefined, { style: "currency", currency: route.currency }).format(route.fare) : "Fare unavailable"}</p>
                                <ol className="space-y-4">
                                    {route.steps.map((step, stepIndex) => (
                                        <li key={stepIndex} className="flex gap-3 border-t pt-3">
                                            {step.mode === "TRANSIT" ? <Bus className="shrink-0" /> : <Footprints className="shrink-0" />}
                                            <div>
                                                <p className="font-medium">{step.line ? `${step.line}${step.headsign ? ` toward ${step.headsign}` : ""}` : step.instruction || "Walk to the next stop"}</p>
                                                {step.departureStop && <p>{step.departureStop} → {step.arrivalStop}</p>}
                                                {step.departureTime && <p>{time(step.departureTime)} – {time(step.arrivalTime)}</p>}
                                                <p className="text-xs text-slate-600">{Math.ceil(step.durationSeconds / 60)} min · {Math.round(step.distanceMeters)} m{step.agencies.length > 0 ? ` · ${step.agencies.join(", ")}` : ""}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </article>
                        ))}
                        <p className="text-sm">Schedules and fares may change. Preferences may include other transport modes. Transit trips currently do not award EcoPoints.</p>
                        <p className="text-sm">Route information from <a className="font-semibold underline" href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a>.</p>
                    </>}
                </div>
                <div className="space-y-3 md:sticky md:top-24 md:self-start">
                    {embedUrl && <iframe title="Google Maps transit directions" src={embedUrl} className="h-[450px] w-full rounded-2xl border-0" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />}
                    {embedUrl && <p className="text-xs">The map shows current Google transit directions. Scheduled options above may differ.</p>}
                    {externalUrl && <a className="aero-gel inline-flex items-center gap-2 rounded-full px-5 py-3" href={externalUrl} target="_blank" rel="noreferrer">Open in Google Maps <ExternalLink size={16} /></a>}
                </div>
            </div>
        </section>
    );
}
