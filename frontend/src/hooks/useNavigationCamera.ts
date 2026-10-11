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
const FOLLOW_MS = 800;
// fitBounds padding (used for the route preview) persists on the camera, so navigation always
// sets its own. Top-only padding pushes the followed position below the middle of the screen,
// leaving more of the road ahead visible.
const NO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 };
const AHEAD_PADDING_RATIO = 0.3;

function navPadding(map: mapboxgl.Map) {
    return { top: Math.round(map.getContainer().clientHeight * AHEAD_PADDING_RATIO), bottom: 0, left: 0, right: 0 };
}
// gestures that mean the user took manual control of the camera
const GESTURE_EVENTS = ["dragstart", "zoomstart", "rotatestart", "pitchstart"] as const;

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

// Follows the snapped position while navigating and owns the single arrow marker.
// Does not watch location itself; positions come from the navigation hook.
export function useNavigationCamera({ getMap, active, position }: Options) {
    const [stopped, setStopped] = useState(false);
    const markerRef = useRef<mapboxgl.Marker | null>(null);
    const positionRef = useRef(position);
    const following = active && !stopped;

    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    // marker, gesture listeners and map chrome for the lifetime of a navigation session
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

        return () => {
            GESTURE_EVENTS.forEach((name) => map.off(name, listener));
            markerRef.current?.remove();
            markerRef.current = null;
            container.classList.remove("nav-active");
            map.easeTo({ pitch: 0, bearing: 0, padding: NO_PADDING, duration: 600 });
            setStopped(false);
        };
    }, [active, getMap]);

    useEffect(() => {
        if (!active || !position) return;
        const map = getMap();
        if (!map) return;

        if (!markerRef.current) {
            markerRef.current = new mapboxgl.Marker({
                element: createArrowElement(),
                rotationAlignment: "map",
                pitchAlignment: "map",
            })
                .setLngLat([position.lng, position.lat])
                .addTo(map);
        }
        markerRef.current.setLngLat([position.lng, position.lat]).setRotation(position.bearing);

        // mapbox skips non-essential animations when the user prefers reduced motion
        if (following) {
            map.easeTo({
                center: [position.lng, position.lat],
                bearing: position.bearing,
                pitch: NAV_PITCH,
                zoom: NAV_ZOOM,
                padding: navPadding(map),
                duration: FOLLOW_MS,
            });
        }
    }, [active, position, following, getMap]);

    const recenter = useCallback(() => {
        setStopped(false);
        const p = positionRef.current;
        const map = getMap();
        if (!p || !map) return;
        map.easeTo({
            center: [p.lng, p.lat],
            bearing: p.bearing,
            pitch: NAV_PITCH,
            zoom: NAV_ZOOM,
            padding: navPadding(map),
            duration: FOLLOW_MS,
        });
    }, [getMap]);

    return { following, recenter };
}
