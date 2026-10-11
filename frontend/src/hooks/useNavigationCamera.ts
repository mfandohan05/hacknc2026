import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

type Position = { lng: number; lat: number; bearing: number };

type Options = {
    getMap: () => mapboxgl.Map | null;
    active: boolean;
    position: Position | null;
};

const NAV_ZOOM = 17;
const NAV_PITCH = 60;
const SETTLE_MS = 900;
// how quickly the drawn position catches up with the latest fix (smaller = snappier)
const SMOOTHING_MS = 220;
// gestures that mean the user took manual control of the camera
const GESTURE_EVENTS = ["dragstart", "zoomstart", "rotatestart", "pitchstart"] as const;
// fitBounds padding (used for the route preview) persists on the camera, so navigation always
// sets its own. Top-only padding pushes the followed position below the middle of the screen,
// leaving more of the road ahead visible.
const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
const AHEAD_PADDING_RATIO = 0.3;

function navPadding(map: mapboxgl.Map) {
    return { top: Math.round(map.getContainer().clientHeight * AHEAD_PADDING_RATIO), bottom: 0, left: 0, right: 0 };
}

// moves `from` toward `to` along the shortest way round the compass
function lerpAngle(from: number, to: number, t: number) {
    const diff = ((to - from + 540) % 360) - 180;
    return (from + diff * t + 360) % 360;
}

function createArrowElement() {
    const el = document.createElement("div");
    el.style.cssText = "width:44px;height:44px;";
    el.innerHTML = `
        <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true" style="filter:drop-shadow(0 2px 4px rgba(23,51,74,0.45))">
            <circle cx="22" cy="22" r="19" fill="#fff"/>
            <circle cx="22" cy="22" r="15" fill="#39A9DB"/>
            <path d="M22 9 L31 31 L22 26 L13 31 Z" fill="#fff"/>
        </svg>`;
    return el;
}

// Draws the arrow marker and follows it with the camera while navigating.
// GPS fixes arrive about once a second, so the drawn position is eased toward the latest fix on
// every animation frame; the marker and the camera both move continuously instead of in steps.
// Does not watch location itself; positions come from the navigation hook.
export function useNavigationCamera({ getMap, active, position }: Options) {
    const [stopped, setStopped] = useState(false);
    const markerRef = useRef<mapboxgl.Marker | null>(null);
    const targetRef = useRef<Position | null>(position);
    // where the arrow is actually drawn this frame
    const shownRef = useRef<Position | null>(null);
    const followingRef = useRef(false);
    // true while the camera is easing into the navigation view; per-frame updates wait for it
    const settlingRef = useRef(false);
    const following = active && !stopped;
    const hasPosition = position !== null;

    useEffect(() => {
        targetRef.current = position;
        followingRef.current = following;
    }, [position, following]);

    // marker, gesture listeners, map chrome and the frame loop for a navigation session
    useEffect(() => {
        if (!active) return;
        const map = getMap();
        if (!map) return;

        const container = map.getContainer();
        container.classList.add("nav-active");

        // programmatic camera moves carry no originalEvent
        const onGesture = (e: { originalEvent?: unknown }) => {
            if (e.originalEvent) setStopped(true);
        };
        // mapbox's per-event listener types don't all expose originalEvent
        const listener = onGesture as never;
        GESTURE_EVENTS.forEach((name) => map.on(name, listener));

        let raf = 0;
        let last = performance.now();
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            const target = targetRef.current;
            if (!target) return;

            const dt = Math.min(100, now - last);
            last = now;

            const prev = shownRef.current;
            let shown: Position;
            if (!prev) {
                shown = { ...target };
            } else {
                const t = 1 - Math.exp(-dt / SMOOTHING_MS);
                shown = {
                    lng: prev.lng + (target.lng - prev.lng) * t,
                    lat: prev.lat + (target.lat - prev.lat) * t,
                    bearing: lerpAngle(prev.bearing, target.bearing, t),
                };
            }
            shownRef.current = shown;

            if (!markerRef.current) {
                markerRef.current = new mapboxgl.Marker({
                    element: createArrowElement(),
                    rotationAlignment: "map",
                    pitchAlignment: "map",
                })
                    .setLngLat([shown.lng, shown.lat])
                    .addTo(map);
            }
            markerRef.current.setLngLat([shown.lng, shown.lat]).setRotation(shown.bearing);

            if (followingRef.current && !settlingRef.current) {
                map.jumpTo({ center: [shown.lng, shown.lat], bearing: shown.bearing });
            }
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            GESTURE_EVENTS.forEach((name) => map.off(name, listener));
            markerRef.current?.remove();
            markerRef.current = null;
            shownRef.current = null;
            settlingRef.current = false;
            container.classList.remove("nav-active");
            map.easeTo({ pitch: 0, bearing: 0, padding: NO_PADDING, duration: 600 });
            setStopped(false);
        };
    }, [active, getMap]);

    // ease into the navigation view when following starts, and again on Re-center
    useEffect(() => {
        if (!following || !hasPosition) return;
        const map = getMap();
        const target = targetRef.current;
        if (!map || !target) return;

        settlingRef.current = true;
        const onDone = () => {
            settlingRef.current = false;
        };
        map.once("moveend", onDone);
        map.easeTo({
            center: [target.lng, target.lat],
            bearing: target.bearing,
            pitch: NAV_PITCH,
            zoom: NAV_ZOOM,
            padding: navPadding(map),
            duration: SETTLE_MS,
        });

        return () => {
            map.off("moveend", onDone);
            settlingRef.current = false;
        };
    }, [following, hasPosition, getMap]);

    const recenter = useCallback(() => setStopped(false), []);

    return { following, recenter };
}
