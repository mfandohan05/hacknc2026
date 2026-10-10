import { useCallback, useEffect, useRef, useState } from "react";
import { retrievePlace, suggestPlaces } from "@/services/searchService";
import type { SelectedPlace, Suggestion } from "@/services/searchService";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

type Near = { longitude: number; latitude: number } | null | undefined;
type Settled = { q: string; suggestions: Suggestion[]; error: boolean };

// Debounced place autocomplete on the Mapbox Search Box API (suggest + retrieve).
// One session token covers a typing session: every suggest call plus the final retrieve.
export function usePlaceSearch(near?: Near) {
    const [query, setQueryState] = useState("");
    // text filled in by a selection; it is not searched again
    const [suppressed, setSuppressed] = useState<string | null>(null);
    const [settled, setSettled] = useState<Settled | null>(null);
    const [selecting, setSelecting] = useState(false);
    const [selectError, setSelectError] = useState(false);
    const sessionRef = useRef<string | null>(null);
    const nearRef = useRef<Near>(near);

    useEffect(() => {
        nearRef.current = near;
    }, [near]);

    const q = query.trim();
    const active = q.length >= MIN_CHARS && query !== suppressed;

    useEffect(() => {
        const sessionToken = sessionRef.current;
        if (!active || !sessionToken) return;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const suggestions = await suggestPlaces(q, sessionToken, nearRef.current, controller.signal);
                setSettled({ q, suggestions, error: false });
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
                setSettled({ q, suggestions: [], error: true });
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q, active]);

    const setQuery = useCallback((value: string) => {
        // a new session starts when the user starts typing
        if (!sessionRef.current && value.trim().length > 0) sessionRef.current = crypto.randomUUID();
        setSelectError(false);
        setQueryState(value);
    }, []);

    const clear = useCallback(() => {
        sessionRef.current = null;
        setSelectError(false);
        setSuppressed(null);
        setQueryState("");
    }, []);

    const select = useCallback(async (suggestion: Suggestion): Promise<SelectedPlace | null> => {
        const sessionToken = sessionRef.current ?? crypto.randomUUID();
        setSelecting(true);
        try {
            const place = await retrievePlace(suggestion.mapbox_id, sessionToken);
            // the session ends with a retrieve; the next keystroke starts a new one
            sessionRef.current = null;
            setSuppressed(place.name);
            setQueryState(place.name);
            return place;
        } catch {
            setSelectError(true);
            return null;
        } finally {
            setSelecting(false);
        }
    }, []);

    const current = active && settled?.q === q ? settled : null;
    const suggestions = current?.suggestions ?? [];
    const error = selectError || (current?.error ?? false);

    return {
        query,
        setQuery,
        clear,
        select,
        suggestions,
        loading: active && current === null,
        selecting,
        error,
        // a finished search with nothing found
        noResults: current !== null && !current.error && suggestions.length === 0,
        // there is a query worth showing a list for
        hasQuery: active,
    };
}
