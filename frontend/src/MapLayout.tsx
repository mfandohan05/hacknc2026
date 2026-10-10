import NavigationBar from "./NavigationBar";
import MapSearchBox from "./MapSearchBox";
function MapLayout() {
    return (
        <div className="grid grid-cols-1 grid-rows-3">
            <NavigationBar />
            <MapSearchBox />
        </div>
    )
}

export default MapLayout;