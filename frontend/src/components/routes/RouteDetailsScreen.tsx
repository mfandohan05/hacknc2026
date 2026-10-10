import { ArrowLeft, ChevronRight, MapPin, Navigation } from "lucide-react";
import { formatCo2, formatCost, formatDistance, formatDuration, formatStepDuration } from "@/lib/formatRoute";
import type { RouteMode, RouteOption } from "@/types/route";

const MODE_LABEL: Record<RouteMode, string> = {
    WALK: "Walking route",
    BIKE: "Cycling route",
    CAR: "Driving route",
};

type Props = {
    route: RouteOption;
    originLabel: string;
    destinationName: string;
    destinationAddress?: string;
    recommended: boolean;
    onBack: () => void;
};

function RouteDetailsScreen({ route, originLabel, destinationName, destinationAddress, recommended, onBack }: Props) {
    return (
        <div className="aero-bg fixed inset-0 z-[60] flex flex-col overflow-hidden text-[#17334A]">
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

            <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
                <section className="aero-glass rounded-3xl px-5 py-4">
                    <p className="text-3xl font-semibold text-[#208A5D]">{formatDuration(route.durationMinutes)}</p>
                    <p className="text-lg text-[#17334A]/80">({formatDistance(route.distanceKm)})</p>
                    {route.via && <p className="mt-2 text-sm text-[#17334A]/80">via {route.via}</p>}
                    <p className="mt-1 text-sm text-[#17334A]/80">
                        {recommended ? "Recommended " : ""}
                        {recommended ? MODE_LABEL[route.mode].toLowerCase() : MODE_LABEL[route.mode]}
                    </p>
                    <p className="mt-3 text-xs text-[#17334A]/75">
                        Est. cost {formatCost(route.estimatedCost)} · Est. CO₂e {formatCo2(route.estimatedCo2Kg)} · Eco
                        score {route.ecoScore}
                    </p>
                </section>

                <section className="aero-glass mt-4 rounded-3xl px-5 py-4" aria-label="Turn-by-turn directions">
                    <div className="flex items-center gap-3">
                        <Navigation className="size-5 shrink-0 text-[#208A5D]" />
                        <h2 className="text-lg font-semibold">{originLabel}</h2>
                    </div>

                    {route.steps.length === 0 ? (
                        <p className="mt-4 text-sm text-[#17334A]/80">No step-by-step directions available.</p>
                    ) : (
                        <ol className="mt-4 flex flex-col gap-4">
                            {route.steps.map((step, i) => (
                                <li key={i}>
                                    <div className="flex items-start gap-3">
                                        <ChevronRight className="mt-0.5 size-5 shrink-0 text-[#17334A]/60" />
                                        <p className="text-base">{step.instruction}</p>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 pl-8 text-xs text-[#17334A]/75">
                                        <span className="shrink-0">
                                            {formatStepDuration(step.durationSeconds)} ({formatDistance(step.distanceKm)})
                                        </span>
                                        <span className="h-px flex-1 bg-[#17334A]/20" />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}

                    <div className="mt-6 flex items-start gap-3">
                        <MapPin className="mt-1 size-5 shrink-0 text-[#208A5D]" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold">{destinationName}</h2>
                            {destinationAddress && (
                                <p className="text-sm text-[#17334A]/80">{destinationAddress}</p>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default RouteDetailsScreen;
