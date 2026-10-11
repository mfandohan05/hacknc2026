import { Bike, Bus, Car, Footprints, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCo2, formatDistance, formatDuration } from "@/lib/formatRoute";
import type { RouteMode, RouteOption } from "@/types/route";

const MODE_META: Record<RouteMode, { label: string; Icon: LucideIcon }> = {
    WALK: { label: "Walk", Icon: Footprints },
    BIKE: { label: "Bike", Icon: Bike },
    CAR: { label: "Drive", Icon: Car },
    TRANSIT: { label: "Public transport", Icon: Bus },
};

type Props = {
    route: RouteOption;
    selected: boolean;
    recommended: boolean;
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
            className={`route-choice w-full rounded-2xl border bg-white/75 p-3 text-left text-[#17334A] shadow-[0_4px_14px_rgba(23,51,74,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-md transition ${
                selected ? "border-[#208A5D] ring-2 ring-[#208A5D]/60" : "border-white/80"
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

            <dl className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <Stat label="CO₂e (est.)" value={formatCo2(route.estimatedCo2Kg)} />
                <Stat label="Eco points" value={route.tripPoints === undefined ? "—" : String(route.tripPoints)} />
            </dl>

            <div
                className="aero-progress-track mt-2 h-2.5 overflow-hidden rounded-full"
                role="meter"
                aria-label="Emissions savings score"
                aria-valuemin={0}
                aria-valuemax={100}
                        aria-valuenow={Math.min(100, route.ecoScore)}
            >
                <div
                    className="aero-progress-fill h-full rounded-full"
                    style={{ width: `${Math.min(100, route.ecoScore)}%` }}
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
