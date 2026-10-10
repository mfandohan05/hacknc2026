import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"; 

function NavigationBar() {
    return (
        <nav className="absolute inset-x-0 top-0 z-50 flex border-b-1 border-gray-200/50 items-center px-6 py-3 bg-white/30 backdrop-blur-md backdrop-saturate-150 justify-between">
            <h1 className="text-[#231F20] text-2xl font-semibold flex flex-row"><img src='../image_assets/vista_search_globe.ico' className='size-10' />EcoQuest</h1>
            <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Account">
                <Avatar>
                    <AvatarFallback className="bg-gray-200">
                        <User className="size-5 text-gray-500" />
                    </AvatarFallback>
                </Avatar>
            </Button>
        </nav>
    )
}

export default NavigationBar;