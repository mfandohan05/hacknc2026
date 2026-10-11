import { createContext, useContext } from "react";
import type { Cosmetic } from "@/services/rewardsService";

export const ThemeContext = createContext<{
    theme: string;
    equip: (id: string) => boolean;
    updateCosmetics: (cosmetics: Cosmetic[]) => void;
}>({
    theme: "sprout",
    equip: () => false,
    updateCosmetics: () => {},
});
export const useAppTheme = () => useContext(ThemeContext);
