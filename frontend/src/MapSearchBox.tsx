import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function MapSearchBox() {
    return (
        <div className="flex w-full max-w-md items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-md transition-shadow focus-within:shadow-lg">
            <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Menu">
                <Menu className="size-5 text-gray-600" />
            </Button>
            <Input
                type="text"
                placeholder="Let's go green..."
                className="h-9 flex-1 border-0 bg-transparent px-1 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
            />
        </div>
    )
}

export default MapSearchBox;
