import { Bus, ChevronRight, Navigation } from "lucide-react";
import { formatDuration } from "@/lib/formatRoute";
import type { TransitItinerary } from "@/services/transitService";

function clock(value: string | null) {
    return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
}

type Props = {
    itinerary: TransitItinerary;
    // opens the full itinerary
    onSelect: () => void;
    // starts turn-by-turn navigation along this itinerary
    onNavigate?: () => void;
};

// A public transport itinerary summarised like the walk / bike / drive cards.
function TransitCard({ itinerary, onSelect, onNavigate }: Props) {
    const rides = itinerary.steps.filter((s) => s.mode === "TRANSIT");
    const lines = [...new Set(rides.map((s) => s.line).filter((l): l is string => !!l))];
    const leaves = clock(rides[0]?.departureTime ?? null);
    const fare =
        itinerary.fare !== null && itinerary.currency
            ? new Intl.NumberFormat(undefined, { style: "currency", currency: itinerary.currency }).format(itinerary.fare)
            : "Fare unavailable";

    return (
        <div className="rounded-2xl border border-white/80 bg-white/75 text-[#17334A] shadow-[0_4px_14px_rgba(23,51,74,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md">
            <button type="button" onClick={onSelect} className="w-full rounded-2xl p-3 text-left transition hover:bg-white/60">
                <div className="flex items-center gap-3">
                    <span className="aero-blue flex size-11 shrink-0 items-center justify-center rounded-full">
                        <Bus className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold">Public transport</p>
                        <p className="truncate text-xs text-[#17334A]/80">
                            {leaves ? `Leaves ${leaves} · ` : ""}
                            {itinerary.transfers === 0 ? "No transfers" : `${itinerary.transfers} transfer${itinerary.transfers === 1 ? "" : "s"}`}
                        </p>
                    </div>
                    <p className="text-lg font-semibold">{formatDuration(Math.max(1, Math.ceil(itinerary.durationSeconds / 60)))}</p>
                    <ChevronRight className="size-5 shrink-0 text-[#17334A]/50" aria-hidden="true" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                    {lines.slice(0, 4).map((line) => (
                        <span key={line} className="aero-blue rounded-full px-2 py-0.5 font-semibold">
                            {line}
                        </span>
                    ))}
                    <span className="ml-auto rounded-xl bg-white/70 px-2 py-1 font-semibold">{fare}</span>
                </div>
            </button>


            {onNavigate && (
                <div className="px-3 pb-3">
                    <button
                        type="button"
                        onClick={onNavigate}
                        className="aero-gel flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold"
                    >
                        <Navigation className="size-4" aria-hidden="true" />
                        Navigate this route
                    </button>
                </div>
            )}
        </div>
    );
}

export default TransitCard;
