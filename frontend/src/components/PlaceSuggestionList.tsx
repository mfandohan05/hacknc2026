import { Loader2, MapPin } from "lucide-react";
import type { Suggestion } from "@/services/searchService";

type Props = {
    id: string;
    suggestions: Suggestion[];
    active: number;
    loading?: boolean;
    error?: boolean;
    noResults?: boolean;
    className?: string;
    // "screen" sits below the nearest positioned ancestor, inset with margins, and grows with its content up to the bottom of the viewport
    variant?: "dropdown" | "screen";
    onHover: (index: number) => void;
    onChoose: (suggestion: Suggestion) => void;
};

function PlaceSuggestionList({
    id,
    suggestions,
    active,
    loading,
    error,
    noResults,
    className = "",
    variant = "dropdown",
    onHover,
    onChoose,
}: Props) {
    return (
        <ul
            id={id}
            role="listbox"
            className={`absolute inset-x-0 top-full z-10 overflow-y-auto border-white/80 bg-white/55 py-1 backdrop-blur-md backdrop-saturate-150 ${
                variant === "screen" ? "mx-3 mt-2 max-h-[calc(100dvh-100%-1.25rem)] md:max-h-[calc(100dvh-100%-3.25rem)]" : "mt-2 max-h-80"
            } rounded-2xl border shadow-lg ${className}`}
        >
            {loading && (
                <li className="flex items-center gap-2 px-4 py-3 text-sm text-[#17334A]/80">
                    <Loader2 className="size-4 animate-spin" />
                    Searching…
                </li>
            )}
            {error && <li className="px-4 py-3 text-sm text-[#17334A]">Couldn't load places. Try again.</li>}
            {noResults && <li className="px-4 py-3 text-sm text-[#17334A]/80">No results</li>}
            {suggestions.map((s, i) => (
                <li
                    key={s.mapbox_id}
                    id={`${id}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => onHover(i)}
                    onClick={() => onChoose(s)}
                    className={`flex cursor-pointer items-start gap-3 px-4 py-2.5 ${i === active ? "bg-[#208A5D]/10" : ""}`}
                >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#208A5D]" />
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#17334A]">{s.name}</div>
                        {s.place_formatted && (
                            <div className="truncate text-xs text-[#17334A]/70">{s.place_formatted}</div>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default PlaceSuggestionList;
