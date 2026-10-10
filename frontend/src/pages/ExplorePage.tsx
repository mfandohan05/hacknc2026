import { useState } from "react";
import NavigationBar from "../NavigationBar";
import MapSearchBox from "../MapSearchBox";
import type { SearchResult } from "../MapSearchBox";
import InteractiveMap from "../InteractiveMap";
import DirectionsSheet from "../DirectionsSheet";
import type { Mode } from "../DirectionsSheet";
import DirectionsScreen from "../DirectionsScreen";

const DIRECTION_MODES: Mode[] = ["drive", "walk", "bike"];

function ExplorePage() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [place, setPlace] = useState<SearchResult | null>(null);
    const [directionsMode, setDirectionsMode] = useState<Mode | null>(null);

    const handleSelectMode = (mode: Mode) => {
        if (DIRECTION_MODES.includes(mode)) setDirectionsMode(mode);
    };

    return (
        <div className="relative h-screen w-full overflow-hidden">
            <InteractiveMap onMapClick={() => setSheetOpen(false)} target={place} />
            <NavigationBar />
            <DirectionsSheet open={sheetOpen} onOpenChange={setSheetOpen} onSelectMode={handleSelectMode} />
            <div className="absolute top-20 left-4 right-4 z-40 flex">
                <MapSearchBox onSelect={setPlace} />
            </div>
            {directionsMode && (
                <DirectionsScreen
                    mode={directionsMode}
                    destination={place}
                    onModeChange={setDirectionsMode}
                    onClose={() => setDirectionsMode(null)}
                />
            )}
        </div>
    );
}

export default ExplorePage;
