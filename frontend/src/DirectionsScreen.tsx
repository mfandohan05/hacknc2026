import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowUpDown, Leaf, X } from "lucide-react";
import PlaceSuggestionList from "@/components/PlaceSuggestionList";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import type { SelectedPlace, Suggestion } from "@/services/searchService";
import type { Mode } from "./DirectionsSheet";

const YOUR_LOCATION = "Your location";

type Endpoint = {
    text: string;
    place: SelectedPlace | null;
};

export type DirectionsResult = {
    origin: SelectedPlace | null;
    destination: SelectedPlace | null;
    mode: Mode;
};

type Props = {
    initialMode?: Mode;
    origin?: SelectedPlace | null;
    destination?: SelectedPlace | null;
    onDone: (result: DirectionsResult) => void;
    near?: { longitude: number; latitude: number } | null;
};

export default function DirectionsScreen({ initialMode = "drive", origin: initialOrigin, destination, onDone, near }: Props) {
    const mode = initialMode;
    const [origin, setOrigin] = useState<Endpoint>({
        text: initialOrigin?.name ?? YOUR_LOCATION,
        place: initialOrigin ?? null,
    });
    const [dest, setDest] = useState<Endpoint>({
        text: destination?.name ?? "",
        place: destination ?? null,
    });
    const [swapKey, setSwapKey] = useState(0);
    const destInputRef = useRef<HTMLInputElement>(null);
    const [originTyping, setOriginTyping] = useState(false);
    const [destTyping, setDestTyping] = useState(false);

    const typing = originTyping || destTyping;

    const done = () => onDone({ origin: origin.place, destination: dest.place, mode });

    const swap = () => {
        setOrigin(dest);
        setDest(origin);
        setOriginTyping(false);
        setDestTyping(false);
        setSwapKey((k) => k + 1);
    };

    return (
        <div className="aero-overlay-in fixed inset-0 z-[60] flex flex-col overflow-hidden md:absolute md:inset-auto md:bottom-4 md:left-4 md:top-4 md:w-[400px] md:rounded-3xl md:border md:border-[#0c263c]/55 md:shadow-2xl">
            <div aria-hidden className="aero-glass pointer-events-none absolute inset-0 overflow-hidden" />

            <div className="aero-glass relative z-20 w-full rounded-b-3xl pb-3" style={{ viewTransitionName: "route-summary" }}>
                <div className="flex items-start gap-3 px-3 pt-4">
                    <button
                        type="button"
                        onClick={done}
                        aria-label="Back"
                        className="aero-orb mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full"
                    >
                        <ArrowLeft className="size-5" />
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <PlaceField
                            key={`origin-${swapKey}`}
                            label="Starting point"
                            placeholder="Choose starting point"
                            value={origin}
                            onChange={setOrigin}
                            near={near}
                            onTypingChange={setOriginTyping}
                            clearable
                        />
                        <PlaceField
                            key={`dest-${swapKey}`}
                            label="Destination"
                            placeholder="Choose destination"
                            value={dest}
                            onChange={setDest}
                            near={near}
                            inputRef={destInputRef}
                            onTypingChange={setDestTyping}
                            onPicked={(place) => onDone({ origin: origin.place, destination: place, mode })}
                            autoFocus={!dest.place}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={swap}
                        aria-label="Swap start and destination"
                        className="aero-orb mt-[3.1rem] flex size-11 shrink-0 items-center justify-center rounded-full"
                    >
                        <ArrowUpDown className="size-5" />
                    </button>
                </div>

            </div>

            <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-6 pt-10">
                {!typing && (
                    <button
                        type="button"
                        onClick={() => (dest.place ? done() : destInputRef.current?.focus())}
                        className="aero-glass flex max-w-xs flex-col items-center gap-3 rounded-3xl px-6 py-6 text-center"
                    >
                        <span className="aero-gel flex size-12 items-center justify-center rounded-full">
                            <Leaf className="size-6" />
                        </span>
                        <p className="text-sm font-medium text-[#17334A]">
                            {dest.place
                                ? `Go to ${dest.place.name} and see routes`
                                : "Choose a destination to plan a greener trip."}
                        </p>
                    </button>
                )}
            </div>
        </div>
    );
}

type FieldProps = {
    label: string;
    placeholder: string;
    value: Endpoint;
    onChange: (value: Endpoint) => void;
    onTypingChange?: (typing: boolean) => void;
    onPicked?: (place: SelectedPlace) => void;
    near?: { longitude: number; latitude: number } | null;
    inputRef?: React.Ref<HTMLInputElement>;
    clearable?: boolean;
    autoFocus?: boolean;
};

function PlaceField({ label, placeholder, value, onChange, onTypingChange, onPicked, near, inputRef, clearable, autoFocus }: FieldProps) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const { setQuery, clear, select, suggestions, loading, error, noResults, hasQuery } = usePlaceSearch(near);

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
        onTypingChange?.(false);
        onChange({ text: place.name, place });
        onPicked?.(place);
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

    const showDropdown = open && hasQuery && (loading || error || noResults || suggestions.length > 0);

    return (
        <div ref={rootRef}>
            <div className="aero-input flex h-11 items-center rounded-full px-4">
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-label={label}
                    aria-expanded={showDropdown}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                    autoFocus={autoFocus}
                    value={value.text}
                    placeholder={placeholder}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActive(-1);
                        setOpen(true);
                        onTypingChange?.(e.target.value.length > 0);
                        onChange({ text: e.target.value, place: null });
                    }}
                    onFocus={(e) => {
                        e.currentTarget.select();
                        if (suggestions.length) setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    className="min-w-0 flex-1 bg-transparent text-base text-[#17334A] outline-none placeholder:text-[#17334A]/55"
                />
                {clearable && value.text && (
                    <button
                        type="button"
                        aria-label={`Clear ${label.toLowerCase()}`}
                        onClick={() => {
                            clear();
                            setOpen(false);
                            onTypingChange?.(false);
                            onChange({ text: "", place: null });
                        }}
                        className="aero-orb ml-2 flex size-7 shrink-0 items-center justify-center rounded-full"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            {showDropdown && (
                <PlaceSuggestionList
                    id={listId}
                    suggestions={suggestions}
                    active={active}
                    loading={loading}
                    error={error}
                    noResults={noResults}
                    variant="screen"
                    onHover={setActive}
                    onChoose={(sug) => void choose(sug)}
                />
            )}
        </div>
    );
}
