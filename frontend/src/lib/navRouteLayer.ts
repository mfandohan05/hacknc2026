import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import type { Coordinate } from "@/types/navigation";

const SOURCE_ID = "nav-route";
const CASING_LAYER_ID = "nav-route-casing";
const LINE_LAYER_ID = "nav-route-line";

function toData(coords: Coordinate[] | null): Parameters<GeoJSONSource["setData"]>[0] {
    return {
        type: "FeatureCollection",
        features: coords
            ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }]
            : [],
    };
}

export function syncNavRoute(map: MapboxMap, coords: Coordinate[] | null) {
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
        source.setData(toData(coords));
    } else {
        map.addSource(SOURCE_ID, { type: "geojson", data: toData(coords) });
    }

    if (!map.getLayer(CASING_LAYER_ID)) {
        map.addLayer({
            id: CASING_LAYER_ID,
            type: "line",
            source: SOURCE_ID,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#FFFFFF", "line-width": 12, "line-opacity": 0.95 },
        });
    }
    if (!map.getLayer(LINE_LAYER_ID)) {
        map.addLayer({
            id: LINE_LAYER_ID,
            type: "line",
            source: SOURCE_ID,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#39A9DB", "line-width": 7 },
        });
    }
}

export function removeNavRoute(map: MapboxMap) {
    if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
    if (map.getLayer(CASING_LAYER_ID)) map.removeLayer(CASING_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}
