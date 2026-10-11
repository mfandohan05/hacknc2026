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

// one walking stretch (many small provider steps merged) or one ride
type Leg = { transit: boolean; steps: TransitStep[] };

function pathOf(step: TransitStep): Coordinate[] {
    return (step.geometry ?? []).filter((c): c is Coordinate => c.length >= 2);
}

function clock(iso: string | null): string | null {
    return iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
}

// Consecutive walking steps ("Head northeast…", "Turn right…") become one "Walk to the stop" leg.
function groupLegs(steps: TransitStep[]): Leg[] {
    const legs: Leg[] = [];
    for (const step of steps) {
        const transit = step.mode === "TRANSIT";
        const last = legs[legs.length - 1];
        if (!transit && last && !last.transit) last.steps.push(step);
        else legs.push({ transit, steps: [step] });
    }
    return legs;
}

// The second line under a step: which line, toward where, between which stops, and when.
export function stepDetail(step: DirectionsStep | undefined): string | null {
    if (!step) return null;
    const t = step.transit;
    if (!t) return step.detail ?? null;
    const parts: string[] = [];
    if (t.headsign) parts.push(`toward ${t.headsign}`);
    if (t.departureStop && t.arrivalStop) parts.push(`${t.departureStop} → ${t.arrivalStop}`);
    const dep = clock(t.departureTime);
    const arr = clock(t.arrivalTime);
    if (dep && arr) parts.push(`${dep} – ${arr}`);
    if (t.agencies.length > 0) parts.push(t.agencies.join(", "));
    return parts.length > 0 ? parts.join(" · ") : null;
}

// Splits a road route into one piece per leg, sized by each leg's share of the itinerary's distance
// (or duration when distances are missing). The legs' own paths are unknown, so this is a stand-in.
function approximatePaths(legs: Leg[], baseLine: Coordinate[]): Coordinate[][] {
    const line = lineString(baseLine);
    const total = length(line, { units: "meters" });
    const sum = (leg: Leg, key: "distanceMeters" | "durationSeconds") =>
        leg.steps.reduce((acc, s) => acc + Math.max(0, s[key]), 0);
    const byDistance = legs.map((l) => sum(l, "distanceMeters"));
    const weights = byDistance.some((d) => d > 0) ? byDistance : legs.map((l) => sum(l, "durationSeconds"));
    const weightSum = weights.reduce((a, b) => a + b, 0) || legs.length;

    let acc = 0;
    return weights.map((w) => {
        const start = (total * acc) / weightSum;
        acc += w || (weightSum === legs.length ? 1 : 0);
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
// one step per walking stretch or ride ("Walk to Main St stop", "Board 7 toward Downtown…",
// "Get off at Station St…"), joined end to end.
// Uses the legs' own paths when the backend sends them; otherwise estimates them from `fallbackPath`
// (a road route from the start to the destination). Returns null when neither is available.
export function itineraryToRoute(
    itinerary: TransitItinerary,
    destinationName: string,
    fallbackPath?: Coordinate[],
): TransitRoute | null {
    if (itinerary.steps.length === 0) return null;
    const legs = groupLegs(itinerary.steps);

    let paths: Coordinate[][] = legs.map((leg) => leg.steps.flatMap(pathOf));
    let approximate = false;

    if (!paths.some((p) => p.length >= 2)) {
        if (!fallbackPath || fallbackPath.length < 2) return null;
        paths = approximatePaths(legs, fallbackPath);
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

    const where = destinationName || "your destination";
    const steps: DirectionsStep[] = legs.map((leg, i) => {
        const previous = legs[i - 1];
        const next = legs[i + 1];
        const first = leg.steps[0];
        const getOff =
            previous?.transit && previous.steps[0].arrivalStop ? `Get off at ${previous.steps[0].arrivalStop}. ` : "";
        const distance = leg.steps.reduce((sum, s) => sum + s.distanceMeters, 0);
        const duration = leg.steps.reduce((sum, s) => sum + s.durationSeconds, 0);

        if (leg.transit) {
            const line = first.line ?? "your transit line";
            const toward = first.headsign ? ` toward ${first.headsign}` : "";
            const at = first.departureStop ? ` at ${first.departureStop}` : "";
            return {
                maneuver: { type: TRANSIT_BOARD, location: paths[i][0], instruction: `${getOff}Board ${line}${toward}${at}` },
                name: first.line ?? "",
                distance,
                duration,
                transit: {
                    line: first.line,
                    headsign: first.headsign,
                    departureStop: first.departureStop,
                    arrivalStop: first.arrivalStop,
                    departureTime: first.departureTime,
                    arrivalTime: first.arrivalTime,
                    agencies: first.agencies,
                },
            };
        }

        // walking: head to the next stop, or to the destination
        const target = next?.transit ? (next.steps[0].departureStop ?? "the stop") : where;
        // provider instructions sometimes contain line breaks
        const firstMove = first.instruction?.replace(/\s*\n+\s*/g, ". ").trim();
        return {
            maneuver: {
                type: i === 0 ? "depart" : TRANSIT_WALK,
                location: paths[i][0],
                instruction: `${getOff}Walk to ${target}`,
            },
            name: "",
            distance,
            duration,
            detail: firstMove || undefined,
        };
    });

    const lastLeg = legs[legs.length - 1];
    const lastPath = paths[paths.length - 1];
    const getOff = lastLeg.transit && lastLeg.steps[0].arrivalStop ? `Get off at ${lastLeg.steps[0].arrivalStop}. ` : "";
    steps.push({
        maneuver: {
            type: "arrive",
            location: lastPath[lastPath.length - 1],
            instruction: `${getOff}You have arrived at ${where}`,
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
