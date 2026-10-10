import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Bike, Bus, Car, Footprints, LayoutGrid, TrainFront, TramFront } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Mode = "drive" | "walk" | "bike" | "all" | "bus" | "metro" | "train";

const SHEET_HEIGHT = 340;
const PEEK_HEIGHT = 185;
const MAX_OFFSET = SHEET_HEIGHT - PEEK_HEIGHT;

const primaryModes: { id: Mode; label: string; Icon: LucideIcon }[] = [
    { id: "drive", label: "Drive", Icon: Car },
    { id: "walk", label: "Walk", Icon: Footprints },
    { id: "bike", label: "Bike", Icon: Bike },
];

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
};

export default function DirectionsSheet({ open, onOpenChange, onSelectMode }: Props) {
    const [dragOffset, setDragOffset] = useState<number | null>(null);
    const dragging = dragOffset !== null;
    const offset = dragOffset ?? (open ? 0 : MAX_OFFSET);
    const [selected, setSelected] = useState<Mode | null>(null);
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
        // a tap toggles; a drag snaps to the nearest end
        onOpenChange(moved ? offset <= MAX_OFFSET / 2 : !open);
    };

    const choose = (mode: Mode) => {
        setSelected(mode);
        onSelectMode?.(mode);
    };

    return (
        <div
            className="absolute inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] md:bottom-0 aero-glass z-50 rounded-t-3xl border-b-0"
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
                <h2 className="mt-3 text-center text-xl font-semibold text-[#17334A] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">Directions</h2>
            </div>

            <div className="px-6 pt-4">
                <div className="flex justify-around">
                    {primaryModes.map(({ id, label, Icon }) => (
                        <ModeButton
                            key={id}
                            label={label}
                            Icon={Icon}
                            active={selected === id}
                            onClick={() => choose(id)}
                            size="lg"
                        />
                    ))}
                </div>

                <div className="my-5 h-px bg-gradient-to-r from-transparent via-[#17334A]/25 to-transparent" />

                <p className="mb-3 text-center text-sm font-medium text-[#17334A]">Public transport</p>
                <div className="flex justify-around">
                    {transitModes.map(({ id, label, Icon }) => (
                        <ModeButton
                            key={id}
                            label={label}
                            Icon={Icon}
                            active={selected === id}
                            onClick={() => choose(id)}
                            size="sm"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function ModeButton({
    label,
    Icon,
    active,
    onClick,
    size,
}: {
    label: string;
    Icon: LucideIcon;
    active: boolean;
    onClick: () => void;
    size: "lg" | "sm";
}) {
    const circle = size === "lg" ? "h-16 w-16" : "h-12 w-12";
    const icon = size === "lg" ? "h-7 w-7" : "h-5 w-5";
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex flex-col items-center gap-1.5 text-sm font-medium text-[#17334A]"
        >
            <span
                className={`${circle} flex items-center justify-center rounded-full transition ${
                    active ? "aero-gel ring-4 ring-[#2FB6E8]/50" : "aero-orb"
                }`}
            >
                <Icon className={icon} />
            </span>
            {label}
        </button>
    );
}
