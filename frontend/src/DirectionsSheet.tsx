import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Bus, ChevronRight, LayoutGrid, Leaf, Navigation, TrainFront, TramFront } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import RouteComparison from "@/components/routes/RouteComparison";
import PreferenceSliders from "@/components/routes/PreferenceSliders";
import type { PreferenceWeights } from "@/lib/routeScoring";
import type { RouteOption } from "@/types/route";

export type Mode = "drive" | "walk" | "bike" | "all" | "bus" | "metro" | "train";

const MAX_SHEET_HEIGHT = 600;
const PEEK_HEIGHT = 190;

const transitModes: { id: Mode; label: string; Icon: LucideIcon }[] = [
    { id: "all", label: "All", Icon: LayoutGrid },
    { id: "bus", label: "Bus", Icon: Bus },
    { id: "metro", label: "Metro", Icon: TramFront },
    { id: "train", label: "Train", Icon: TrainFront },
];

function computeSheetHeight() {
    return Math.min(MAX_SHEET_HEIGHT, Math.round(window.innerHeight * 0.7));
}

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectMode?: (mode: Mode) => void;
    originLabel: string;
    destinationLabel: string | null;
    onEditRoute: () => void;
    routes: RouteOption[];
    recommendedRouteId: string | null;
    selectedRouteId: string | null;
    loading: boolean;
    error: string | null;
    weights: PreferenceWeights;
    onWeightsChange: (weights: PreferenceWeights) => void;
    onSelectRoute: (routeId: string) => void;
    onStartTrip: (route: RouteOption) => void;
};

export default function DirectionsSheet({
    open,
    onOpenChange,
    onSelectMode,
    originLabel,
    destinationLabel,
    onEditRoute,
    routes,
    recommendedRouteId,
    selectedRouteId,
    loading,
    error,
    weights,
    onWeightsChange,
    onSelectRoute,
    onStartTrip,
}: Props) {
    const [sheetHeight, setSheetHeight] = useState(computeSheetHeight);
    const [dragOffset, setDragOffset] = useState<number | null>(null);
    const [selectedTransit, setSelectedTransit] = useState<Mode | null>(null);
    const drag = useRef<{ startY: number; startOffset: number; moved: boolean } | null>(null);

    const maxOffset = sheetHeight - PEEK_HEIGHT;
    const dragging = dragOffset !== null;
    const offset = dragOffset ?? (open ? 0 : maxOffset);
    const selectedRoute = routes.find((r) => r.routeId === selectedRouteId) ?? null;

    useEffect(() => {
        const onResize = () => setSheetHeight(computeSheetHeight());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const clamp = (v: number) => Math.min(maxOffset, Math.max(0, v));

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startY: e.clientY, startOffset: offset, moved: false };
        setDragOffset(offset);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        const delta = e.clientY - drag.current.startY;
        if (Math.abs(delta) > 3) drag.current.moved = true;
        setDragOffset(clamp(drag.current.startOffset + delta));
    };

    const onPointerUp = () => {
        if (!drag.current) return;
        const { moved } = drag.current;
        drag.current = null;
        setDragOffset(null);
        // a tap toggles; a drag snaps to the nearest end
        onOpenChange(moved ? offset <= maxOffset / 2 : !open);
    };

    const chooseTransit = (mode: Mode) => {
        setSelectedTransit(mode);
        onSelectMode?.(mode);
    };

    return (
        <div
            className="aero-glass absolute inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:bottom-0 z-50 flex flex-col rounded-t-3xl border-b-0"
            style={{
                height: sheetHeight,
                transform: `translateY(${offset}px)`,
                transition: dragging ? "none" : "transform 220ms ease-out",
            }}
        >
            <div
                className="shrink-0 cursor-grab touch-none select-none pb-2 pt-2 active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div className="mx-auto h-1.5 w-10 rounded-full bg-[#17334A]/30 shadow-[inset_0_1px_1px_rgba(0,0,0,0.15)]" />
                <h2 className="mt-3 text-center text-xl font-semibold text-[#17334A] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                    Directions
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
                <button
                    type="button"
                    onClick={onEditRoute}
                    className="aero-input flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[#17334A]"
                >
                    <Navigation className="size-5 shrink-0 text-[#208A5D]" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-semibold">{originLabel}</span>
                        <span className="px-1.5 text-[#17334A]/60">→</span>
                        <span className={destinationLabel ? "font-semibold" : "text-[#17334A]/70"}>
                            {destinationLabel ?? "Choose destination"}
                        </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-[#17334A]/60" />
                </button>

                <div className="mt-4 flex flex-col gap-3">
                    {!destinationLabel && (
                        <EmptyNote>Search for a destination to compare walking, biking and driving.</EmptyNote>
                    )}

                    {destinationLabel && loading && (
                        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading routes">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/60" />
                            ))}
                        </div>
                    )}

                    {destinationLabel && !loading && error && <EmptyNote>{error}</EmptyNote>}

                    {destinationLabel && !loading && !error && routes.length === 0 && (
                        <EmptyNote>
                            {originLabel === "Your location"
                                ? "Waiting for your location. Allow location access to see routes."
                                : "No routes found."}
                        </EmptyNote>
                    )}

                    {routes.length > 0 && (
                        <>
                            <RouteComparison
                                routes={routes}
                                recommendedRouteId={recommendedRouteId}
                                selectedRouteId={selectedRouteId}
                                onSelect={onSelectRoute}
                            />
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
                                Cost, emissions and eco score are estimates. Cost covers fuel only.
                            </p>
                        </>
                    )}
                </div>

                <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#17334A]/25 to-transparent" />

                <p className="mb-3 text-center text-sm font-medium text-[#17334A]">Public transport</p>
                <div className="flex justify-around">
                    {transitModes.map(({ id, label, Icon }) => (
                        <TransitButton
                            key={id}
                            label={label}
                            Icon={Icon}
                            active={selectedTransit === id}
                            onClick={() => chooseTransit(id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/80 bg-white/70 px-4 py-5 text-center text-sm font-medium text-[#17334A]">
            <span className="aero-gel flex size-10 items-center justify-center rounded-full">
                <Leaf className="size-5" />
            </span>
            {children}
        </div>
    );
}

function TransitButton({
    label,
    Icon,
    active,
    onClick,
}: {
    label: string;
    Icon: LucideIcon;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-1.5 text-sm font-medium text-[#17334A]"
        >
            <span
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                    active ? "aero-gel ring-4 ring-[#2FB6E8]/50" : "aero-orb"
                }`}
            >
                <Icon className="h-5 w-5" />
            </span>
            {label}
        </button>
    );
}
