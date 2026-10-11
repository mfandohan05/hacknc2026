import { Bus, ChevronRight, Navigation } from "lucide-react";
import { formatDuration } from "@/lib/formatRoute";
import type { TransitItinerary } from "@/services/transitService";
import { transitTripOption } from "@/services/transitService";
import { routePoints } from "@/lib/routePoints";

function clock(value: string | null) {
    return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
}

type Props = {
    itinerary: TransitItinerary;
    tripPoints?: number;
    // opens the full itinerary
    onSelect: () => void;
    onNavigate?: () => void;
};

// A public transport itinerary summarised like the walk / bike / drive cards.
function TransitCard({ itinerary, tripPoints, onSelect, onNavigate }: Props) {
    const points = routePoints({ ...transitTripOption(itinerary), tripPoints });
    const rides = itinerary.steps.filter((s) => s.mode === "TRANSIT");
    const lines = [...new Set(rides.map((s) => s.line).filter((l): l is string => !!l))];
    const leaves = clock(rides[0]?.departureTime ?? null);
    const fare =
        itinerary.fare !== null && itinerary.currency
            ? new Intl.NumberFormat(undefined, { style: "currency", currency: itinerary.currency }).format(itinerary.fare)
            : "Fare unavailable";

    return (
        <div className="route-choice vista-item text-[#17334A]">
            <button type="button" onClick={onSelect} className="w-full cursor-pointer rounded-[4px] p-3 text-left transition">
                <div className="flex items-center gap-3">
                    <span className="vista-tile flex size-11 shrink-0 items-center justify-center">
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
                        <span key={line} className="vista-tile px-1.5 py-0.5 font-semibold">
                            {line}
                        </span>
                    ))}
                    <span className="vista-field ml-auto px-2 py-1 font-semibold">{fare}</span>
                </div>
                <p className="mt-3 text-xs">Eco points (est.) <span className="font-semibold">{points === null ? "—" : String(points)}</span></p>
            </button>


            {onNavigate && (
                <div className="px-3 pb-3">
                    <button
                        type="button"
                        onClick={onNavigate}
                        className="vista-button vista-button-primary flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold"
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
