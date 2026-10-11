import { PartyPopper } from "lucide-react";
import { formatNavDistance, formatNavDuration } from "@/lib/formatNav";

type Props = {
    distanceMeters: number;
    durationSeconds: number;
    isDemo: boolean;
    onComplete: () => void;
};

function ArrivedCard({ distanceMeters, durationSeconds, isDemo, onComplete }: Props) {
    return (
        <div
            className="absolute inset-x-0 bottom-0 z-50 px-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
            <div
                role="status"
                className="aero-glass mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl px-5 py-6 text-center text-[#17334A]"
            >
                <span className="aero-gel flex size-16 items-center justify-center rounded-full">
                    <PartyPopper className="size-8" aria-hidden="true" />
                </span>
                <h2 className="text-2xl font-bold">You've arrived</h2>
                {isDemo && (
                    <span className="aero-red rounded-full px-3 py-0.5 text-xs font-bold tracking-wide">
                        DEMO · simulated trip
                    </span>
                )}
                <dl className="grid w-full grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                        <dt className="text-xs text-[#17334A]/75">Distance</dt>
                        <dd className="text-lg font-bold">{formatNavDistance(distanceMeters)}</dd>
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                        <dt className="text-xs text-[#17334A]/75">Duration</dt>
                        <dd className="text-lg font-bold">{formatNavDuration(durationSeconds)}</dd>
                    </div>
                </dl>
                <button
                    type="button"
                    onClick={onComplete}
                    className="aero-gel h-12 w-full rounded-full text-base font-semibold"
                >
                    Complete trip
                </button>
            </div>
        </div>
    );
}

export default ArrivedCard;
