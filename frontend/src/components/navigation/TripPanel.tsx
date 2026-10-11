import { Volume2, VolumeX } from "lucide-react";
import { formatEta, formatNavDistance, formatNavDuration } from "@/lib/formatNav";
import type { DemoSpeed } from "@/hooks/useNavigation";

type Props = {
    remainingDuration: number;
    remainingDistance: number;
    progress: number;
    muted: boolean;
    isDemo: boolean;
    demoSpeed: DemoSpeed;
    onToggleMute: () => void;
    onSetDemoSpeed: (speed: DemoSpeed) => void;
    onEnd: () => void;
};

const DEMO_SPEEDS: DemoSpeed[] = [1, 2, 4];

function TripPanel({
    remainingDuration,
    remainingDistance,
    progress,
    muted,
    isDemo,
    demoSpeed,
    onToggleMute,
    onSetDemoSpeed,
    onEnd,
}: Props) {
    const percent = Math.round(progress * 100);

    return (
        <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-50 px-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
            <div className="aero-glass pointer-events-auto mx-auto max-w-md rounded-2xl px-4 py-3 text-[#17334A]">
                <div className="flex items-center gap-3">
                    <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-center">
                        <Stat label="Arrive" value={formatEta(remainingDuration)} />
                        <Stat label="Time" value={formatNavDuration(remainingDuration)} />
                        <Stat label="Distance" value={formatNavDistance(remainingDistance)} />
                    </div>
                    <button
                        type="button"
                        onClick={onToggleMute}
                        aria-label={muted ? "Unmute voice guidance" : "Mute voice guidance"}
                        aria-pressed={muted}
                        className="aero-orb flex size-11 shrink-0 items-center justify-center rounded-full"
                    >
                        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                    </button>
                    <button
                        type="button"
                        onClick={onEnd}
                        className="aero-red h-11 shrink-0 rounded-full px-4 text-sm font-semibold"
                    >
                        End
                    </button>
                </div>

                <div
                    className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#17334A]/15"
                    role="progressbar"
                    aria-label="Trip progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                >
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#54C571] to-[#208A5D] transition-[width] duration-500 motion-reduce:transition-none"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                {isDemo && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="aero-red rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide">
                            DEMO · simulated
                        </span>
                        <div role="group" aria-label="Demo speed" className="flex gap-1.5">
                            {DEMO_SPEEDS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => onSetDemoSpeed(s)}
                                    aria-pressed={demoSpeed === s}
                                    className={`h-11 min-w-11 rounded-full px-3 text-sm font-semibold ${
                                        demoSpeed === s ? "aero-gel" : "aero-orb"
                                    }`}
                                >
                                    {s}x
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#17334A]/70">{label}</p>
            <p className="truncate text-base font-bold">{value}</p>
        </div>
    );
}

export default TripPanel;
