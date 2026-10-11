import { PartyPopper } from "lucide-react";
import { formatNavDistance, formatNavDuration } from "@/lib/formatNav";

type Props = {
    distanceMeters: number;
    durationSeconds: number;
    isDemo: boolean;
    onComplete: () => void;
    // saving the trip
    busy?: boolean;
    receipt?: { earned: number; balance: number } | null;
    // saving failed; the user can try again
    error?: string | null;
};

function ArrivedCard({ distanceMeters, durationSeconds, isDemo, onComplete, busy = false, error = null, receipt = null }: Props) {
    return (
        <div
            className="absolute inset-x-0 bottom-0 z-50 px-3 md:inset-x-auto md:bottom-4 md:left-4 md:w-[27rem]"
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
                {receipt && <p className="font-semibold">+{receipt.earned} points · Balance: {receipt.balance.toLocaleString()}</p>}
                {error && (
                    <p role="alert" className="text-sm font-medium text-[#c93a30]">
                        {error}
                    </p>
                )}
                <button
                    type="button"
                    onClick={onComplete}
                    disabled={busy}
                    className="aero-gel h-12 w-full rounded-full text-base font-semibold disabled:opacity-70"
                >
                    {busy ? "Saving…" : error ? "Try again" : receipt || isDemo ? "Done" : "Complete trip"}
                </button>
            </div>
        </div>
    );
}

export default ArrivedCard;
