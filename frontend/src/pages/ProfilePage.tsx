import { MapPin, Route, Star, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AeroWindow from "@/components/layout/AeroWindow";

type ProfileData = {
    name: string;
    points: number;
    tripsCompleted: number;
};

// Temporary profile data. Replace this with the user/trip data source later.
const profile: ProfileData = {
    name: "Alex Green",
    points: 0,
    tripsCompleted: 0,
};

function ProfilePage() {
    return (
        <main className="aero-bg relative min-h-full px-4 pt-16 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1.5rem)] md:px-6 md:pb-6">
            <span aria-hidden className="aero-bubble -right-10 top-24 size-36" />
            <span aria-hidden className="aero-bubble left-4 top-1/2 size-16" />
            <span aria-hidden className="aero-bubble bottom-40 right-8 size-24" />

            <section className="relative mx-auto flex max-w-lg flex-col gap-4">
                <AeroWindow title="Profile" Icon={User} as="h1" bodyClassName="p-5">
                    <div className="flex items-center gap-4">
                        <div className="aero-gel flex size-16 shrink-0 items-center justify-center rounded-full">
                            <Avatar>
                                <AvatarImage 
                                    src="../image_assets/dsuiext_4099.ico"
                                    alt="Profile"
                                />
                                <AvatarFallback className="bg-transparent">
                                    <User className="size-8 text-[#17334A]" />
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold">{profile.name}</p>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/55 p-4">
                            <div className="flex items-center gap-2 text-sm text-[#17334A]/65">
                                <Star className="size-4" />
                                Points
                            </div>
                            <p className="mt-2 text-3xl font-bold tabular-nums">{profile.points.toLocaleString()}</p>
                        </div>
                        <div className="rounded-2xl bg-white/55 p-4">
                            <div className="flex items-center gap-2 text-sm text-[#17334A]/65">
                                <Route className="size-4" />
                                Trips completed
                            </div>
                            <p className="mt-2 text-3xl font-bold tabular-nums">{profile.tripsCompleted}</p>
                        </div>
                    </div>
                </AeroWindow>

                <AeroWindow title="Previous trips" Icon={Route} bodyClassName="p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[#17334A]/75">Your points will come from these trips.</p>
                        <MapPin className="size-5 text-[#208A5D]" />
                    </div>

                    <div className="mt-5 rounded-2xl border border-dashed border-[#17334A]/20 bg-white/30 px-4 py-8 text-center">
                        <p className="font-medium">No trips to display yet</p>
                        <p className="mt-1 text-sm text-[#17334A]/60">
                            Trip history and earned points will appear here once connected.
                        </p>
                    </div>
                </AeroWindow>
            </section>
        </main>
    );
}

export default ProfilePage;
