import { along, length, lineSliceAlong, lineString } from "@turf/turf";
import type { TransitItinerary, TransitStep } from "@/services/transitService";
import type { Coordinate, DirectionsRoute, DirectionsStep } from "@/types/navigation";

// maneuver.type values used for transit steps (ManeuverIcon maps them to a bus / walking icon)
export const TRANSIT_BOARD = "transit-board";
export const TRANSIT_WALK = "transit-walk";

export type TransitRoute = {
    route: DirectionsRoute;
    // true when the path was estimated from a road route rather than taken from the transit provider
    approximate: boolean;
};

function pathOf(step: TransitStep): Coordinate[] {
    return (step.geometry ?? []).filter((c): c is Coordinate => c.length >= 2);
}

// What the user should do at the start of this step.
function actionText(step: TransitStep, previous: TransitStep | undefined): string {
    const prefix =
        previous?.mode === "TRANSIT" && previous.arrivalStop ? `Get off at ${previous.arrivalStop}. ` : "";
    if (step.mode === "TRANSIT") {
        const line = step.line ?? "your transit line";
        const toward = step.headsign ? ` toward ${step.headsign}` : "";
        const at = step.departureStop ? ` at ${step.departureStop}` : "";
        return `${prefix}Board ${line}${toward}${at}`;
    }
    // provider instructions sometimes contain line breaks
    const walk = step.instruction?.replace(/\s*\n+\s*/g, ". ").trim();
    return `${prefix}${walk || "Walk to the next stop"}`;
}

// Splits a road route into one piece per leg, sized by each leg's share of the itinerary's distance
// (or duration when distances are missing). The legs' own paths are unknown, so this is a stand-in.
function approximatePaths(steps: TransitStep[], baseLine: Coordinate[]): Coordinate[][] {
    const line = lineString(baseLine);
    const total = length(line, { units: "meters" });
    const byDistance = steps.map((s) => Math.max(0, s.distanceMeters));
    const useDistance = byDistance.some((d) => d > 0);
    const weights = useDistance ? byDistance : steps.map((s) => Math.max(0, s.durationSeconds));
    const weightSum = weights.reduce((a, b) => a + b, 0) || steps.length;

    let acc = 0;
    return weights.map((w) => {
        const start = (total * acc) / weightSum;
        acc += w || (weightSum === steps.length ? 1 : 0);
        const end = Math.min(total, Math.max(start + 1, (total * acc) / weightSum));
        const from = Math.min(start, Math.max(0, total - 1));
        const slice = lineSliceAlong(line, from, end, { units: "meters" }).geometry.coordinates as Coordinate[];
        if (slice.length >= 2) return slice;
        return [
            along(line, from, { units: "meters" }).geometry.coordinates as Coordinate,
            along(line, end, { units: "meters" }).geometry.coordinates as Coordinate,
        ];
    });
}

// Turns a public transport itinerary into the same route shape the turn-by-turn navigation uses:
// one step per walking or riding leg, joined end to end.
// Uses the legs' own paths when the backend sent them; otherwise estimates them from `fallbackPath`
// (a road route from the start to the destination). Returns null when neither is available.
export function itineraryToRoute(
    itinerary: TransitItinerary,
    destinationName: string,
    fallbackPath?: Coordinate[],
): TransitRoute | null {
    if (itinerary.steps.length === 0) return null;

    let paths = itinerary.steps.map(pathOf);
    let approximate = false;

    if (!paths.some((p) => p.length >= 2)) {
        if (!fallbackPath || fallbackPath.length < 2) return null;
        paths = approximatePaths(itinerary.steps, fallbackPath);
        approximate = true;
    } else {
        // some legs have paths: bridge the others with a straight line between their neighbours
        for (let i = 0; i < paths.length; i += 1) {
            if (paths[i].length >= 2) continue;
            let from: Coordinate | undefined;
            for (let j = i - 1; j >= 0 && !from; j -= 1) from = paths[j].at(-1);
            let to: Coordinate | undefined;
            for (let j = i + 1; j < paths.length && !to; j += 1) to = paths[j][0];
            const start = paths[i][0] ?? from ?? to;
            const end = to ?? paths[i][0] ?? from;
            if (!start || !end) return null;
            paths[i] = [start, end];
        }
    }

    const coordinates: Coordinate[] = [];
    paths.forEach((path, i) => {
        const [last] = coordinates.slice(-1);
        const skipFirst = i > 0 && last && last[0] === path[0][0] && last[1] === path[0][1];
        coordinates.push(...(skipFirst ? path.slice(1) : path));
    });

    const steps: DirectionsStep[] = itinerary.steps.map((step, i) => ({
        maneuver: {
            type: i === 0 && step.mode !== "TRANSIT" ? "depart" : step.mode === "TRANSIT" ? TRANSIT_BOARD : TRANSIT_WALK,
            location: paths[i][0],
            instruction: actionText(step, itinerary.steps[i - 1]),
        },
        name: step.line ?? "",
        distance: step.distanceMeters,
        duration: step.durationSeconds,
    }));

    const lastStep = itinerary.steps[itinerary.steps.length - 1];
    const lastPath = paths[paths.length - 1];
    const getOff = lastStep.mode === "TRANSIT" && lastStep.arrivalStop ? `Get off at ${lastStep.arrivalStop}. ` : "";
    steps.push({
        maneuver: {
            type: "arrive",
            location: lastPath[lastPath.length - 1],
            instruction: `${getOff}You have arrived at ${destinationName || "your destination"}`,
        },
        name: "",
        distance: 0,
        duration: 0,
    });

    const distance = steps.reduce((sum, s) => sum + s.distance, 0);
    const duration = steps.reduce((sum, s) => sum + s.duration, 0);
    return {
        approximate,
        route: {
            geometry: { type: "LineString", coordinates },
            distance: distance > 0 ? distance : itinerary.distanceMeters,
            duration: duration > 0 ? duration : itinerary.durationSeconds,
            legs: [{ distance, duration, steps }],
        },
    };
}
