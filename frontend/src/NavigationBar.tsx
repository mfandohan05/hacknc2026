import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react"; 
import { useNavigate } from "react-router-dom";

function NavigationBar() {
    const navigate = useNavigate();

    return (
        <nav className="aero-glass absolute inset-x-0 top-0 z-50 flex items-center justify-between rounded-b-3xl border-x-0 border-t-0 px-6 py-3">
            <h1 className="select-none text-[#17334A] text-2xl font-semibold flex flex-row items-center gap-2 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]"><img src='../image_assets/vista_search_globe.ico' className='size-8' alt=""/>EcoQuest</h1>
            <Button
                variant="ghost"
                size="icon-lg"
                className="aero-orb rounded-full hover:bg-transparent"
                aria-label="Open profile"
                onClick={() => navigate("/profile")}
            >
                <Avatar>
                    <AvatarImage 
                        src="../image_assets/dsuiext_4099.ico"
                        alt="Profile"
                    />
                    <AvatarFallback className="bg-transparent">
                        <User className="size-5 text-[#17334A]" />
                    </AvatarFallback>
                </Avatar>
            </Button>
        </nav>
    )
}

export default NavigationBar;
