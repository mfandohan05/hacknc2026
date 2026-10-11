
export type NavProfile = "driving" | "walking" | "cycling";

export type Coordinate = [number, number];

export type BannerText = {
    text: string;
    type?: string;
    modifier?: string;
};

export type BannerInstruction = {
    distanceAlongGeometry: number;
    primary: BannerText;
    secondary?: BannerText | null;
    sub?: BannerText | null;
};

export type VoiceInstruction = {
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

export type DirectionsStep = {
    maneuver: Maneuver;
    name: string;
    distance: number;
    duration: number;
    bannerInstructions?: BannerInstruction[];
    voiceInstructions?: VoiceInstruction[];
    detail?: string;
    transit?: TransitLegInfo;
};

export type TransitLegInfo = {
    line: string | null;
    headsign: string | null;
    departureStop: string | null;
    arrivalStop: string | null;
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
    distance: number;
    duration: number;
    legs: DirectionsLeg[];
};

export type NavPosition = {
    lng: number;
    lat: number;
    heading: number | null;
};
