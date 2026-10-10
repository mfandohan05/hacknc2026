import { MapPin } from "lucide-react";
import type { SearchResult } from "@/hooks/usePlaceSearch";

type Props = {
    id: string;
    results: SearchResult[];
    active: number;
    error?: boolean;
    className?: string;
    // "screen" sits below the nearest positioned ancestor, inset with margins, and grows with its content up to the bottom of the viewport
    variant?: "dropdown" | "screen";
    onHover: (index: number) => void;
    onChoose: (result: SearchResult) => void;
};

function PlaceSuggestionList({ id, results, active, error, className = "", variant = "dropdown", onHover, onChoose }: Props) {
    return (
        <ul
            id={id}
            role="listbox"
            className={`absolute inset-x-0 top-full z-10 overflow-y-auto border-white/80 bg-white/80 py-1 backdrop-blur-xl backdrop-saturate-150 ${
                variant === "screen"
                    ? "mx-3 mt-2 max-h-[calc(100dvh-100%-1.25rem)]"
                    : "mt-2 max-h-80"
            } rounded-2xl border shadow-[0_10px_30px_rgba(23,51,74,0.22),inset_0_1px_0_rgba(255,255,255,0.95)] ${className}`}
        >
            {error && (
                <li className="px-4 py-3 text-sm text-gray-700">Couldn't load suggestions. Try again.</li>
            )}
            {results.map((r, i) => (
                <li
                    key={r.id}
                    id={`${id}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => onHover(i)}
                    onClick={() => onChoose(r)}
                    className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i === active ? "bg-[#208A5D]/10" : ""}`}
                >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#208A5D]" />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#17334A]">{r.name}</div>
                        {r.address && <div className="truncate text-xs text-gray-700">{r.address}</div>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default PlaceSuggestionList;
