import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowUpDown, Bike, Car, Footprints, Leaf, TrainFront, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PlaceSuggestionList from "@/components/PlaceSuggestionList";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import type { SearchResult } from "@/hooks/usePlaceSearch";
import type { Mode } from "./DirectionsSheet";

const YOUR_LOCATION = "Your location";

const tabs: { id: Mode; label: string; Icon: LucideIcon }[] = [
    { id: "drive", label: "Drive", Icon: Car },
    { id: "all", label: "Public transport", Icon: TrainFront },
    { id: "walk", label: "Walk", Icon: Footprints },
    { id: "bike", label: "Bike", Icon: Bike },
];

type Endpoint = {
    text: string;
    place: SearchResult | null;
};

type Props = {
    mode: Mode;
    destination?: SearchResult | null;
    onModeChange: (mode: Mode) => void;
    onClose: () => void;
};

export default function DirectionsScreen({ mode, destination, onModeChange, onClose }: Props) {
    const [origin, setOrigin] = useState<Endpoint>({ text: YOUR_LOCATION, place: null });
    const [dest, setDest] = useState<Endpoint>({
        text: destination?.name ?? "",
        place: destination ?? null,
    });
    const [swapKey, setSwapKey] = useState(0);
    // whether the user is mid-edit in each field, used to hide the empty-state card
    const [originTyping, setOriginTyping] = useState(false);
    const [destTyping, setDestTyping] = useState(false);

    const typing = originTyping || destTyping;

    const swap = () => {
        setOrigin(dest);
        setDest(origin);
        setOriginTyping(false);
        setDestTyping(false);
        setSwapKey((k) => k + 1);
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden">
            <div aria-hidden className="aero-bg pointer-events-none absolute inset-0 overflow-hidden">
                <span className="aero-bubble -right-8 top-56 size-32" />
                <span className="aero-bubble left-6 top-80 size-14" />
                <span className="aero-bubble bottom-32 right-10 size-20" />
                <span className="aero-bubble -left-6 bottom-12 size-28" />
                <span className="aero-bubble bottom-64 left-1/2 size-8" />
            </div>

            <div className="aero-glass relative rounded-b-3xl pb-3">
                <div className="flex items-start gap-3 px-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
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
                            onTypingChange={setOriginTyping}
                            clearable
                        />
                        <PlaceField
                            key={`dest-${swapKey}`}
                            label="Destination"
                            placeholder="Choose destination"
                            value={dest}
                            onChange={setDest}
                            onTypingChange={setDestTyping}
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

                {!typing && (
                    <div role="tablist" className="mt-4 flex px-2">
                        {tabs.map(({ id, label, Icon }) => {
                            const active = mode === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    aria-label={label}
                                    onClick={() => onModeChange(id)}
                                    className="flex flex-1 justify-center"
                                >
                                    <span
                                        className={`flex h-11 w-[4.5rem] items-center justify-center rounded-full transition ${
                                            active ? "aero-gel" : "aero-orb"
                                        }`}
                                    >
                                        <Icon className="size-6" />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="relative flex flex-1 items-start justify-center overflow-y-auto px-6 pt-10">
                {!typing && (
                    <div className="aero-glass flex max-w-xs flex-col items-center gap-3 rounded-3xl px-6 py-6 text-center">
                        <span className="aero-gel flex size-12 items-center justify-center rounded-full">
                            <Leaf className="size-6" />
                        </span>
                        <p className="text-sm font-medium text-[#17334A]">
                            {dest.place
                                ? "Route options will appear here."
                                : "Choose a destination to plan a greener trip."}
                        </p>
                    </div>
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
    clearable?: boolean;
    autoFocus?: boolean;
};

function PlaceField({ label, placeholder, value, onChange, onTypingChange, clearable, autoFocus }: FieldProps) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [dirty, setDirty] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const { results, loading, error } = usePlaceSearch(value.text, dirty);

    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, []);

    const choose = (r: SearchResult) => {
        setDirty(false);
        setOpen(false);
        onTypingChange?.(false);
        onChange({ text: r.name, place: r });
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
        <div ref={rootRef}>
            <div className="aero-input flex h-11 items-center rounded-full px-4">
                <input
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
                        setDirty(true);
                        setActive(-1);
                        setOpen(true);
                        onTypingChange?.(e.target.value.length > 0);
                        onChange({ text: e.target.value, place: null });
                    }}
                    onFocus={(e) => {
                        e.currentTarget.select();
                        if (results.length) setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    className="min-w-0 flex-1 bg-transparent text-base text-[#17334A] outline-none placeholder:text-[#17334A]/55"
                />
                {clearable && value.text && (
                    <button
                        type="button"
                        aria-label={`Clear ${label.toLowerCase()}`}
                        onClick={() => {
                            setDirty(false);
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
                    results={results}
                    active={active}
                    error={error}
                    variant="screen"
                    onHover={setActive}
                    onChoose={choose}
                />
            )}
        </div>
    );
}
