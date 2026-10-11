import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getRewards, readCosmetic, saveCosmetic } from "@/services/rewardsService";
import type { Cosmetic } from "@/services/rewardsService";
import { ThemeContext } from "./ThemeContext";
import { runViewTransition } from "@/lib/viewTransition";

function AccountTheme({ userId, children }: { userId: string | null; children: ReactNode }) {
    const [selected, setSelected] = useState(() => userId ? readCosmetic(userId) : "sprout");
    const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
    const theme = cosmetics.some((c) => c.id === selected && c.unlocked) ? selected : "sprout";
    useEffect(() => {
        if (!userId) return;
        // Warm the wallpapers so the first theme fade includes the image.
        for (const src of ["/image_assets/sprouty-background.jpg", "/image_assets/ocean-background.png", "/image_assets/sunset-asadal.jpg", "/image_assets/fauna-leaves.jpg"]) {
            const wallpaper = new Image();
            wallpaper.src = src;
        }
        const abort = new AbortController();
        void getRewards(abort.signal).then((data) => {
            if (!abort.signal.aborted) setCosmetics(data.cosmetics);
        }).catch(() => { /* Keep the default theme when account rewards are unavailable. */ });
        const sync = (event: StorageEvent) => {
            if (event.key === `aeropath:cosmetic:${userId}` || event.key === null) {
                runViewTransition(() => setSelected(readCosmetic(userId)), "theme");
            }
        };
        window.addEventListener("storage", sync);
        return () => { abort.abort(); window.removeEventListener("storage", sync); };
    }, [userId]);
    const equip = (id: string) => {
        if (!userId || !cosmetics.some((c) => c.id === id && c.unlocked)) return false;
        runViewTransition(() => setSelected(id), "theme");
        return saveCosmetic(userId, id);
    };
    return <ThemeContext.Provider value={{ theme, equip, updateCosmetics: setCosmetics }}>
        <div className="app-theme contents" data-theme={theme}>{children}</div>
    </ThemeContext.Provider>;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    return <AccountTheme key={user?.id ?? "guest"} userId={user?.id ?? null}>{children}</AccountTheme>;
}
