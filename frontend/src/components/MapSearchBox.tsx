import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlaceSuggestionList from "@/components/PlaceSuggestionList";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import type { SelectedPlace, Suggestion } from "@/services/searchService";

type Props = {
    onSelectPlace?: (place: SelectedPlace) => void;
    // used to bias suggestions toward the user
    userLocation?: { longitude: number; latitude: number } | null;
};

function MapSearchBox({ onSelectPlace, userLocation }: Props) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const { query, setQuery, clear, select, suggestions, loading, selecting, error, noResults, hasQuery } =
        usePlaceSearch(userLocation);

    // Close when clicking outside
    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, []);

    const choose = async (suggestion: Suggestion) => {
        const place = await select(suggestion);
        if (!place) return;
        setOpen(false);
        setActive(-1);
        onSelectPlace?.(place);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setOpen(false);
        } else if (e.key === "ArrowDown" && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % suggestions.length);
        } else if (e.key === "ArrowUp" && suggestions.length) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        } else if (e.key === "Enter" && open && suggestions.length) {
            e.preventDefault();
            void choose(suggestions[active >= 0 ? active : 0]);
        }
    };

    const showList = open && hasQuery && (loading || error || noResults || suggestions.length > 0);
    const busy = loading || selecting;

    return (
        <div ref={rootRef} className="relative w-full max-w-md">
            <div className="aero-glass aero-input flex w-full items-center gap-1 rounded-full px-2 py-1.5">
                <Button variant="ghost" size="icon-lg" className="aero-orb rounded-full hover:bg-transparent" aria-label="Menu">
                    <Menu className="size-5 text-[#17334A]" />
                </Button>
                <Input
                    type="text"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(-1);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Let's go green..."
                    className="h-9 flex-1 border-0 bg-transparent px-1 text-base text-[#17334A] placeholder:text-[#17334A]/60 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                />
                {busy && <Loader2 className="mr-2 size-4 animate-spin text-[#208A5D]" aria-label="Searching" />}
                {!busy && query && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="aero-orb rounded-full hover:bg-transparent"
                        aria-label="Clear search"
                        onClick={() => {
                            clear();
                            setOpen(false);
                        }}
                    >
                        <X className="size-4 text-[#17334A]" />
                    </Button>
                )}
            </div>

            {showList && (
                <PlaceSuggestionList
                    id={listId}
                    suggestions={suggestions}
                    active={active}
                    loading={loading}
                    error={error}
                    noResults={noResults}
                    onHover={setActive}
                    onChoose={(s) => void choose(s)}
                />
            )}
        </div>
    );
}

export default MapSearchBox;
