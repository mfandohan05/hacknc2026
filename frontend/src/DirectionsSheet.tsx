import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Bus, ChevronRight, LayoutGrid, Navigation, Route, TrainFront, TramFront } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Mode = "drive" | "walk" | "bike" | "all" | "bus" | "metro" | "train";

const SHEET_HEIGHT = 340;
const PEEK_HEIGHT = 185;
const MAX_OFFSET = SHEET_HEIGHT - PEEK_HEIGHT;

const transitModes: { id: Mode; label: string; Icon: LucideIcon }[] = [
    { id: "all", label: "All", Icon: LayoutGrid },
    { id: "bus", label: "Bus", Icon: Bus },
    { id: "metro", label: "Metro", Icon: TramFront },
    { id: "train", label: "Train", Icon: TrainFront },
];

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectMode?: (mode: Mode) => void;
    originLabel: string;
    destinationLabel: string | null;
    onEditRoute: () => void;
    onViewRoutes: () => void;
};

export default function DirectionsSheet({
    open,
    onOpenChange,
    onSelectMode,
    originLabel,
    destinationLabel,
    onEditRoute,
    onViewRoutes,
}: Props) {
    const [dragOffset, setDragOffset] = useState<number | null>(null);
    const dragging = dragOffset !== null;
    const offset = dragOffset ?? (open ? 0 : MAX_OFFSET);
    const [selectedTransit, setSelectedTransit] = useState<Mode | null>(null);
    const drag = useRef<{ startY: number; startOffset: number; moved: boolean } | null>(null);

    const clamp = (v: number) => Math.min(MAX_OFFSET, Math.max(0, v));

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
        onOpenChange(moved ? offset <= MAX_OFFSET / 2 : !open);
    };

    const chooseTransit = (mode: Mode) => {
        setSelectedTransit(mode);
        onSelectMode?.(mode);
    };

    return (
        <div
            className="aero-glass absolute inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:bottom-0 z-50 rounded-t-3xl border-b-0"
            style={{
                height: SHEET_HEIGHT,
                transform: `translateY(${offset}px)`,
                transition: dragging ? "none" : "transform 220ms ease-out",
            }}
        >
            <div
                className="cursor-grab touch-none select-none pb-2 pt-2 active:cursor-grabbing"
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

            <div className="px-4 pt-2">
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

                <button
                    type="button"
                    onClick={onViewRoutes}
                    disabled={!destinationLabel}
                    className="aero-gel mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-semibold disabled:opacity-50"
                >
                    <Route className="size-5" />
                    {destinationLabel ? "See routes" : "Choose a destination first"}
                </button>

                <div className="my-4 h-px bg-gradient-to-r from-transparent via-[#17334A]/25 to-transparent" />

                <p className="mb-3 text-center text-sm font-medium text-[#17334A]">Public transport</p>
                <div className="flex justify-around">
                    {transitModes.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => chooseTransit(id)}
                            className="flex flex-col items-center gap-1.5 text-sm font-medium text-[#17334A]"
                        >
                            <span
                                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                                    selectedTransit === id ? "aero-gel ring-4 ring-[#2FB6E8]/50" : "aero-orb"
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                            </span>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
