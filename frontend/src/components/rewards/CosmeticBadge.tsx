import { Droplets, Leaf, Sparkles, Sun } from "lucide-react";

const styles = {
    sprout: { label: "Sprouty", Icon: Leaf, color: "from-emerald-100 via-green-300 to-teal-500" },
    ocean: { label: "Ocean", Icon: Droplets, color: "from-sky-100 via-cyan-300 to-blue-500" },
    sunset: { label: "Sunset", Icon: Sun, color: "from-yellow-100 via-amber-300 to-orange-500" },
    aurora: { label: "Fauna", Icon: Sparkles, color: "from-cyan-100 via-violet-300 to-fuchsia-500" },
};
const badgeImages: Record<string, string> = {
    sprout: "/image_assets/sprouty-bubbles.png",
    ocean: "/image_assets/ocean.png",
    sunset: "/image_assets/sunset-weather.png",
    aurora: "/image_assets/red-bug.png",
};
export default function CosmeticBadge({ id, large = false }: { id: string; large?: boolean }) {
    const { label, Icon, color } = styles[id as keyof typeof styles] ?? styles.sprout;
    if (id === "sprout") {
        // Frame the central globe within the source's wide, off-center canvas.
        return <svg role="img" aria-label="Sprouty badge" viewBox="530 425 755 755"
            className={`inline-block shrink-0 overflow-hidden rounded-full drop-shadow-md ${large ? "size-20" : "size-12"}`}>
            <image href={badgeImages.sprout} width="1987" height="1369" />
        </svg>;
    }
    if (Object.hasOwn(badgeImages, id)) {
        return <img src={badgeImages[id]} alt={`${label} badge`}
            className={`inline-block shrink-0 object-contain drop-shadow-md ${large ? "size-20" : "size-12"}`} />;
    }
    return <span role="img" aria-label={`${label} badge`} className={`relative isolate overflow-hidden inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br shadow-[inset_0_2px_3px_white,inset_0_-5px_9px_#00456555,0_6px_12px_#00456533] ${color} ${large ? "size-20" : "size-12"}`}>
        <span aria-hidden="true" className="absolute inset-x-[8%] top-[4%] h-[47%] rounded-[50%] bg-gradient-to-b from-white/95 to-white/10" />
        <span aria-hidden="true" className="absolute bottom-[6%] h-[12%] w-[55%] rounded-[50%] bg-white/50 blur-sm" />
        <Icon aria-hidden="true" className={large ? "relative size-9 text-emerald-950 drop-shadow-[0_1px_1px_white]" : "relative size-6 text-emerald-950 drop-shadow-[0_1px_1px_white]"} />
    </span>;
}
