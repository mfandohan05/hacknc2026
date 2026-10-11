import type { Map as MapboxMap } from "mapbox-gl";

// Aero look for the Mapbox streets style: aqua water, pale theme-tinted land, soft green parks,
// white roads with a faint blue edge, light glassy buildings. Label layers are left alone.
const WATER = "#8fd9f4";
const WATERWAY = "#7fd0ee";
const PARK = "#c3ecc8";
const ROAD = "#ffffff";
const ROAD_CASING = "#bcd6e8";
const BUILDING = "#e3edf5";
const FALLBACK_LAND = "#eaf6f4";

const HEX = /^#[0-9a-f]{6}$/i;

function themeVar(name: string, fallback: string): string {
  try {
    const el = document.querySelector(".app-theme") ?? document.documentElement;
    const value = getComputedStyle(el).getPropertyValue(name).trim();
    return HEX.test(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function themeAccent(): string {
  return themeVar("--theme-accent", "#208A5D");
}

function set(map: MapboxMap, id: string, prop: string, value: string | number) {
  try {
    map.setPaintProperty(id, prop as Parameters<MapboxMap["setPaintProperty"]>[1], value);
  } catch {
    // a layer in this style version may not support the property
  }
}

export function applyAeroStyle(map: MapboxMap): void {
  const layers = map.getStyle()?.layers ?? [];
  const land = themeVar("--theme-light", FALLBACK_LAND);

  for (const layer of layers) {
    const { id, type } = layer;
    if (type === "background") {
      set(map, id, "background-color", land);
    } else if (type === "fill") {
      if (/^water/.test(id)) set(map, id, "fill-color", WATER);
      else if (/park|landcover|landuse|pitch|golf|grass|wood|scrub|forest|cemetery|sand/.test(id)) {
        set(map, id, "fill-color", PARK);
      } else if (id === "land" || /^land$/.test(id)) set(map, id, "fill-color", land);
      else if (/^building/.test(id)) {
        set(map, id, "fill-color", BUILDING);
        set(map, id, "fill-opacity", 0.85);
      }
    } else if (type === "line") {
      if (/^waterway/.test(id)) set(map, id, "line-color", WATERWAY);
      else if (/^(road|bridge|tunnel)-/.test(id) && !/rail|path|pedestrian|ferry|steps|oneway|arrow|link-\d/.test(id)) {
        if (/case|bridge-.*-case/.test(id)) set(map, id, "line-color", ROAD_CASING);
        else set(map, id, "line-color", ROAD);
      }
    }
  }
}
