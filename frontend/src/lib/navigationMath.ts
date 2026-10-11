import { along, bearing, distance, length, lineString, nearestPointOnLine, point } from "@turf/turf";
import type { Feature, LineString } from "geojson";
import type { BannerInstruction, Coordinate, DirectionsRoute, DirectionsStep } from "@/types/navigation";

export const STEP_ADVANCE_METERS = 20;
export const ARRIVAL_METERS = 25;
export const OFF_ROUTE_METERS = 50;
const FALLBACK_VOICE_METERS = 80;

export type RouteInfo = {
    steps: DirectionsStep[];
    line: Feature<LineString>;
    totalLength: number;
    stepEnds: number[];
    end: Coordinate;
};

export type Located = {
    along: number;
    offRoute: number;
    snapped: Coordinate;
};

export type Progress = {
    distanceToManeuver: number;
    remainingDistance: number;
    remainingDuration: number;
    // 0-1
    fraction: number;
};

export function flattenSteps(route: DirectionsRoute): DirectionsStep[] {
    return route.legs.flatMap((leg) => leg.steps);
}

export function buildRouteInfo(route: DirectionsRoute): RouteInfo {
    const steps = flattenSteps(route);
    const line = lineString(route.geometry.coordinates);
    const totalLength = length(line, { units: "meters" });

    const stepsTotal = steps.reduce((sum, s) => sum + s.distance, 0);
    const scale = stepsTotal > 0 ? totalLength / stepsTotal : 1;
    let acc = 0;
    const stepEnds = steps.map((s) => {
        acc += s.distance * scale;
        return acc;
    });

    const coords = route.geometry.coordinates;
    return { steps, line, totalLength, stepEnds, end: coords[coords.length - 1] };
}

export function locate(info: RouteInfo, position: Coordinate): Located {
    const nearest = nearestPointOnLine(info.line, point(position), { units: "meters" });
    return {
        along: nearest.properties.location ?? 0,
        offRoute: nearest.properties.dist ?? 0,
        snapped: nearest.geometry.coordinates as Coordinate,
    };
}

export function metersBetween(a: Coordinate, b: Coordinate): number {
    return distance(point(a), point(b), { units: "meters" });
}

export function advanceStep(info: RouteInfo, stepIndex: number, alongMeters: number, snapped: Coordinate): number {
    let i = stepIndex;
    while (i < info.steps.length - 1) {
        const nextManeuver = info.steps[i + 1].maneuver.location;
        const reached = metersBetween(snapped, nextManeuver) <= STEP_ADVANCE_METERS;
        const passed = alongMeters >= info.stepEnds[i];
        if (!reached && !passed) break;
        i += 1;
    }
    return i;
}

export function progressAt(info: RouteInfo, stepIndex: number, alongMeters: number): Progress {
    const { steps, stepEnds, totalLength } = info;
    const stepStart = stepIndex > 0 ? stepEnds[stepIndex - 1] : 0;
    const stepLength = stepEnds[stepIndex] - stepStart;
    const distanceToManeuver = Math.max(0, stepEnds[stepIndex] - alongMeters);
    const stepFraction = stepLength > 0 ? Math.min(1, distanceToManeuver / stepLength) : 0;

    let remainingDuration = steps[stepIndex].duration * stepFraction;
    for (let i = stepIndex + 1; i < steps.length; i += 1) remainingDuration += steps[i].duration;

    return {
        distanceToManeuver,
        remainingDistance: Math.max(0, totalLength - alongMeters),
        remainingDuration,
        fraction: totalLength > 0 ? Math.min(1, Math.max(0, alongMeters / totalLength)) : 1,
    };
}

export function pointAt(info: RouteInfo, alongMeters: number): Coordinate {
    const d = Math.min(Math.max(0, alongMeters), info.totalLength);
    return along(info.line, d, { units: "meters" }).geometry.coordinates as Coordinate;
}

export function routeBearingAt(info: RouteInfo, alongMeters: number): number {
    const ahead = Math.min(alongMeters + 15, info.totalLength);
    const from = ahead - alongMeters < 1 ? Math.max(0, alongMeters - 15) : alongMeters;
    const to = ahead - alongMeters < 1 ? alongMeters : ahead;
    const raw = bearing(point(pointAt(info, from)), point(pointAt(info, to)));
    return (raw + 360) % 360;
}

export function pickBanner(step: DirectionsStep | undefined, distanceToManeuver: number): BannerInstruction | null {
    const banners = step?.bannerInstructions;
    if (!banners || banners.length === 0) return null;
    let chosen = banners[0];
    for (const b of banners) {
        if (b.distanceAlongGeometry >= distanceToManeuver) chosen = b;
    }
    return chosen;
}

export type PendingVoice = {
    // keys of every announcement now due, so they are not spoken again
    keys: string[];
    text: string;
};

export function pendingVoice(
    steps: DirectionsStep[],
    stepIndex: number,
    distanceToManeuver: number,
    spoken: Set<string>,
): PendingVoice | null {
    const step = steps[stepIndex];
    const voice = step?.voiceInstructions ?? [];

    if (voice.length > 0) {
        const due = voice
            .filter((v) => distanceToManeuver <= v.distanceAlongGeometry)
            .map((v) => ({ key: `${stepIndex}:${v.distanceAlongGeometry}`, v }))
            .filter((d) => !spoken.has(d.key));
        if (due.length === 0) return null;
        // speak the closest one; earlier ones are stale
        const latest = due.reduce((a, b) => (b.v.distanceAlongGeometry < a.v.distanceAlongGeometry ? b : a));
        return { keys: due.map((d) => d.key), text: latest.v.announcement };
    }

    const next = steps[stepIndex + 1];
    const key = `${stepIndex}:fallback`;
    if (next && distanceToManeuver <= FALLBACK_VOICE_METERS && !spoken.has(key)) {
        return { keys: [key], text: next.maneuver.instruction };
    }
    return null;
}
