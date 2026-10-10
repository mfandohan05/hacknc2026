import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlaceSuggestionList from "@/components/PlaceSuggestionList";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import type { SearchResult } from "@/hooks/usePlaceSearch";

export type { SearchResult };

type Props = {
    onSelect?: (result: SearchResult) => void;
};

function MapSearchBox({ onSelect }: Props) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [picked, setPicked] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const { results, loading, error } = usePlaceSearch(query, !picked);

    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, []);

    const choose = (r: SearchResult) => {
        setPicked(true);
        setQuery(r.name);
        setOpen(false);
        onSelect?.(r);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setOpen(false);
        } else if (e.key === "ArrowDown" && results.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % results.length);
        } else if (e.key === "ArrowUp" && results.length) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
        } else if (e.key === "Enter" && open && results.length) {
            e.preventDefault();
            choose(results[active >= 0 ? active : 0]);
        }
    };

    const showDropdown = open && !loading && (results.length > 0 || error);

    return (
        <div ref={rootRef} className="relative w-full max-w-md">
            <div className="aero-glass aero-input flex w-full items-center gap-1 rounded-full px-2 py-1.5">
                <Button variant="ghost" size="icon-lg" className="aero-orb rounded-full hover:bg-transparent" aria-label="Menu">
                    <Menu className="size-5 text-[#17334A]" />
                </Button>
                <Input
                    type="text"
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setPicked(false);
                        setActive(-1);
                        setOpen(true);
                    }}
                    onFocus={() => results.length && setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Let's go green..."
                    className="h-9 flex-1 border-0 bg-transparent px-1 text-base text-[#17334A] placeholder:text-[#17334A]/60 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
                />
                {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin text-[#208A5D]" aria-label="Searching" />
                ) : query ? (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="aero-orb rounded-full hover:bg-transparent"
                        aria-label="Clear search"
                        onClick={() => {
                            setQuery("");
                            setPicked(false);
                            setOpen(false);
                        }}
                    >
                        <X className="size-4 text-[#17334A]" />
                    </Button>
                ) : null}
            </div>

            {showDropdown && (
                <PlaceSuggestionList
                    id={listId}
                    results={results}
                    active={active}
                    error={error}
                    onHover={setActive}
                    onChoose={choose}
                />
            )}
        </div>
    );
}

export default MapSearchBox;
