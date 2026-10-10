import { Bike, Car, Footprints, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCo2, formatCost, formatDistance, formatDuration } from "@/lib/formatRoute";
import type { RouteMode, RouteOption } from "@/types/route";

const MODE_META: Record<RouteMode, { label: string; Icon: LucideIcon }> = {
    WALK: { label: "Walk", Icon: Footprints },
    BIKE: { label: "Bike", Icon: Bike },
    CAR: { label: "Drive", Icon: Car },
};

type Props = {
    route: RouteOption;
    selected: boolean;
    recommended: boolean;
    // kg CO2e saved compared with driving the same trip, when known and positive
    savingsKg: number | null;
    onSelect: () => void;
};

function RouteCard({ route, selected, recommended, savingsKg, onSelect }: Props) {
    const { label, Icon } = MODE_META[route.mode];

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`w-full rounded-2xl border bg-white/75 p-3 text-left text-[#17334A] shadow-[0_4px_14px_rgba(23,51,74,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md transition ${
                selected ? "border-[#208A5D] ring-2 ring-[#208A5D]/60" : "border-white/80 hover:bg-white/90"
            }`}
        >
            <div className="flex items-center gap-3">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${selected ? "aero-gel" : "aero-orb"}`}>
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{label}</span>
                        {recommended && (
                            <span className="aero-gel inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                <Star className="size-3" />
                                Recommended
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-[#17334A]/80">{formatDistance(route.distanceKm)}</div>
                </div>
                <div className="text-right text-lg font-semibold">{formatDuration(route.durationMinutes)}</div>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Cost (est.)" value={formatCost(route.estimatedCost)} />
                <Stat label="CO₂e (est.)" value={formatCo2(route.estimatedCo2Kg)} />
                <Stat label="Eco score" value={String(route.ecoScore)} />
            </dl>

            <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-[#17334A]/15"
                role="meter"
                aria-label="Eco score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={route.ecoScore}
            >
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#54C571] to-[#208A5D]"
                    style={{ width: `${route.ecoScore}%` }}
                />
            </div>

            {savingsKg !== null && savingsKg > 0 && (
                <p className="mt-2 text-xs font-medium text-[#208A5D]">
                    Saves {formatCo2(savingsKg)} CO₂e vs driving (est.)
                </p>
            )}
        </button>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-white/70 px-1 py-1.5">
            <dt className="text-[11px] text-[#17334A]/75">{label}</dt>
            <dd className="text-sm font-semibold">{value}</dd>
        </div>
    );
}

export default RouteCard;
