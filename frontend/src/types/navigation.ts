// The subset of the Mapbox Directions API response that navigation uses.

export type NavProfile = "driving" | "walking" | "cycling";

export type Coordinate = [number, number];

export type BannerText = {
    text: string;
    type?: string;
    modifier?: string;
};

export type BannerInstruction = {
    // distance from the end of the step at which this banner becomes current
    distanceAlongGeometry: number;
    primary: BannerText;
    secondary?: BannerText | null;
    sub?: BannerText | null;
};

export type VoiceInstruction = {
    // distance from the end of the step at which to speak
    distanceAlongGeometry: number;
    announcement: string;
    ssmlAnnouncement?: string;
};

export type Maneuver = {
    type: string;
    modifier?: string;
    location: Coordinate;
    instruction: string;
    bearing_before?: number;
    bearing_after?: number;
};

// A step starts at its maneuver; its banner and voice instructions describe the maneuver at its end.
export type DirectionsStep = {
    maneuver: Maneuver;
    name: string;
    distance: number;
    duration: number;
    bannerInstructions?: BannerInstruction[];
    voiceInstructions?: VoiceInstruction[];
    // a second line under the instruction (public transport legs)
    detail?: string;
    // set on the leg that rides a bus, train or metro
    transit?: TransitLegInfo;
};

export type TransitLegInfo = {
    line: string | null;
    headsign: string | null;
    departureStop: string | null;
    arrivalStop: string | null;
    // ISO timestamps
    departureTime: string | null;
    arrivalTime: string | null;
    agencies: string[];
};

export type DirectionsLeg = {
    distance: number;
    duration: number;
    summary?: string;
    steps: DirectionsStep[];
};

export type DirectionsRoute = {
    geometry: { type: "LineString"; coordinates: Coordinate[] };
    // meters
    distance: number;
    // seconds
    duration: number;
    legs: DirectionsLeg[];
};

export type NavPosition = {
    lng: number;
    lat: number;
    // degrees clockwise from north, null when the device does not report one
    heading: number | null;
};
