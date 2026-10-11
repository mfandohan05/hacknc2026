import { useEffect, useState } from "react";
import { getRewards, readCosmetic } from "@/services/rewardsService";
import CosmeticBadge from "./CosmeticBadge";

export default function ProfileCosmetic({ userId }: { userId: string }) {
    const [badge, setBadge] = useState("sprout");
    useEffect(() => {
        const abort = new AbortController();
        void getRewards(abort.signal).then((data) => {
            if (abort.signal.aborted) return;
            const selected = readCosmetic(userId);
            setBadge(data.cosmetics.some((c) => c.id === selected && c.unlocked) ? selected : "sprout");
        }).catch(() => { /* The default badge remains available offline. */ });
        return () => abort.abort();
    }, [userId]);
    return <CosmeticBadge id={badge} />;
}
