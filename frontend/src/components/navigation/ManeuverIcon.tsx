import {
    ArrowUp,
    ArrowUpLeft,
    ArrowUpRight,
    CornerUpLeft,
    CornerUpRight,
    Flag,
    MapPin,
    RotateCw,
    Undo2,
} from "lucide-react";

type IconKey = "straight" | "left" | "right" | "slightLeft" | "slightRight" | "uturn" | "roundabout" | "arrive" | "depart";

const ICONS = {
    straight: ArrowUp,
    left: CornerUpLeft,
    right: CornerUpRight,
    slightLeft: ArrowUpLeft,
    slightRight: ArrowUpRight,
    uturn: Undo2,
    roundabout: RotateCw,
    arrive: Flag,
    depart: MapPin,
} as const;

function iconKey(type: string, modifier?: string): IconKey {
    if (type === "arrive") return "arrive";
    if (type === "depart") return "depart";
    if (type === "roundabout" || type === "rotary" || type === "roundabout turn") return "roundabout";
    switch (modifier) {
        case "uturn":
            return "uturn";
        case "left":
        case "sharp left":
            return "left";
        case "right":
        case "sharp right":
            return "right";
        case "slight left":
            return "slightLeft";
        case "slight right":
            return "slightRight";
        default:
            return "straight";
    }
}

type Props = {
    type: string;
    modifier?: string;
    className?: string;
};

function ManeuverIcon({ type, modifier, className }: Props) {
    const Icon = ICONS[iconKey(type, modifier)];
    return <Icon className={className} aria-hidden="true" />;
}

export default ManeuverIcon;
