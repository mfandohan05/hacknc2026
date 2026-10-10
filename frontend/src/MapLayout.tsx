import { useState } from "react";
import NavigationBar from "./NavigationBar";
import MapSearchBox from "./MapSearchBox";
import InteractiveMap from "./InteractiveMap";
import DirectionsSheet from "./DirectionsSheet";
function MapLayout() {
    const [sheetOpen, setSheetOpen] = useState(false);
    return (
        <div className="relative h-screen w-full overflow-hidden">
            <InteractiveMap onMapClick={() => setSheetOpen(false)} />
            <NavigationBar />
            <DirectionsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
            <div className="absolute top-20 left-4 right-4 z-40 flex">
                <MapSearchBox />
            </div>
        </div>
    )
}

export default MapLayout;
