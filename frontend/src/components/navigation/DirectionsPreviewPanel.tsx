import { Play, Radio, X } from "lucide-react";
import ManeuverIcon from "./ManeuverIcon";
import { formatNavDistance, formatNavDuration } from "@/lib/formatNav";
import type { DirectionsRoute, DirectionsStep } from "@/types/navigation";

type Props = {
    route: DirectionsRoute;
    steps: DirectionsStep[];
    modeLabel: string;
    onStart: () => void;
    onDemo: () => void;
    onSelectStep: (step: DirectionsStep) => void;
    onClose: () => void;
};

function DirectionsPreviewPanel({ route, steps, modeLabel, onStart, onDemo, onSelectStep, onClose }: Props) {
    return (
        <div className="flex h-full min-h-0 flex-col text-[#17334A]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-2xl font-semibold text-[#208A5D]">{formatNavDuration(route.duration)}</p>
                    <p className="text-sm text-[#17334A]/80">
                        {formatNavDistance(route.distance)} · {modeLabel}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/80 bg-white/70 px-2.5 py-1 text-xs font-semibold">
                        Estimate
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close directions preview"
                        className="aero-orb flex size-11 items-center justify-center rounded-full"
                    >
                        <X className="size-5" />
                    </button>
                </div>
            </div>

            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={onStart}
                    className="aero-gel flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-base font-semibold"
                >
                    <Play className="size-5" />
                    Start
                </button>
                <button
                    type="button"
                    onClick={onDemo}
                    className="aero-orb flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold"
                >
                    <Radio className="size-4" />
                    Demo drive
                </button>
            </div>

            <ol className="mt-3 min-h-0 flex-1 divide-y divide-[#17334A]/10 overflow-y-auto rounded-2xl border border-white/80 bg-white/70">
                {steps.map((step, i) => (
                    <li key={i}>
                        <button
                            type="button"
                            onClick={() => onSelectStep(step)}
                            className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/60"
                        >
                            <span className="aero-blue flex size-9 shrink-0 items-center justify-center rounded-xl">
                                <ManeuverIcon type={step.maneuver.type} modifier={step.maneuver.modifier} className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1 text-sm">{step.maneuver.instruction}</span>
                            {step.distance > 0 && (
                                <span className="shrink-0 text-xs font-medium text-[#17334A]/75">
                                    {formatNavDistance(step.distance)}
                                </span>
                            )}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default DirectionsPreviewPanel;
