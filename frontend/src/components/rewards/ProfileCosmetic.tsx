import { useAppTheme } from "@/context/ThemeContext";
import CosmeticBadge from "./CosmeticBadge";

export default function ProfileCosmetic() {
    const { theme } = useAppTheme();
    return <CosmeticBadge id={theme} />;
}
