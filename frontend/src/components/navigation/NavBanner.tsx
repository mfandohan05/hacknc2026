import { Loader2 } from "lucide-react";
import ManeuverIcon from "./ManeuverIcon";
import { formatNavDistance } from "@/lib/formatNav";
import { stepDetail } from "@/lib/transitRoute";
import type { BannerInstruction, DirectionsStep } from "@/types/navigation";

type Props = {
    // the step being driven; its banner describes the maneuver at its end
    step: DirectionsStep | undefined;
    // the step after it, used for the street name and "then" hint
    nextStep: DirectionsStep | undefined;
    afterNextStep: DirectionsStep | undefined;
    banner: BannerInstruction | null;
    distanceToManeuver: number;
    rerouting: boolean;
    isDemo: boolean;
};

// show a "then" hint when the following maneuver comes right after the next one
const THEN_WITHIN_METERS = 250;
const THEN_STEP_MAX_METERS = 200;

function NavBanner({ step, nextStep, afterNextStep, banner, distanceToManeuver, rerouting, isDemo }: Props) {
    const upcoming = nextStep ?? step;
    const type = banner?.primary.type ?? upcoming?.maneuver.type ?? "turn";
    const modifier = banner?.primary.modifier ?? upcoming?.maneuver.modifier;
    const instruction = banner?.primary.text ?? upcoming?.maneuver.instruction ?? "Continue";
    // public transport legs describe the line, stops and times here; roads show the street name
    const street = banner?.secondary?.text ?? stepDetail(nextStep) ?? nextStep?.name ?? "";

    const showThen =
        !!afterNextStep &&
        !!nextStep &&
        distanceToManeuver <= THEN_WITHIN_METERS &&
        nextStep.distance <= THEN_STEP_MAX_METERS;

    return (
        <div
            className="pointer-events-none absolute inset-x-0 top-0 z-50 px-3 pb-2 md:inset-x-auto md:left-4 md:top-4 md:w-[27rem] md:pt-0!"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
            <div className="aero-glass pointer-events-auto mx-auto flex max-w-md items-center gap-4 rounded-2xl px-4 py-3 text-[#17334A]">
                <span className="aero-blue flex size-16 shrink-0 items-center justify-center rounded-2xl">
                    {rerouting ? (
                        <Loader2 className="size-8 animate-spin" aria-hidden="true" />
                    ) : (
                        <ManeuverIcon type={type} modifier={modifier} className="size-9" />
                    )}
                </span>
                <div className="min-w-0 flex-1">
                    {rerouting ? (
                        <p className="text-xl font-bold" role="status">
                            Rerouting…
                        </p>
                    ) : (
                        <>
                            <p className="text-3xl font-bold leading-tight">{formatNavDistance(distanceToManeuver)}</p>
                            {/* only the instruction is announced; the changing distance would be too chatty */}
                            <p aria-live="polite" className="text-base font-medium leading-snug">
                                {instruction}
                            </p>
                            {street && street !== instruction && (
                                <p className="line-clamp-2 text-sm text-[#17334A]/75">{street}</p>
                            )}
                        </>
                    )}
                </div>
                {isDemo && (
                    <span className="aero-red shrink-0 self-start rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide">
                        DEMO
                    </span>
                )}
            </div>

            {showThen && afterNextStep && !rerouting && (
                <div className="pointer-events-auto mx-auto mt-2 flex max-w-md justify-start">
                    <span className="aero-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[#17334A]">
                        <span className="text-[#17334A]/70">Then</span>
                        <ManeuverIcon
                            type={afterNextStep.maneuver.type}
                            modifier={afterNextStep.maneuver.modifier}
                            className="size-4"
                        />
                        <span className="max-w-[14rem] truncate">{afterNextStep.maneuver.instruction}</span>
                    </span>
                </div>
            )}
        </div>
    );
}

export default NavBanner;
