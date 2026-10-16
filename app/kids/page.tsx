import { Sidebar } from "@/app/_components/sidebar";
import { KidsView } from "@/app/_components/kids-view";
import { children } from "@/app/_data/children";
import { room, sessionUser } from "@/app/_data/feed";

export default function KidsPage() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar user={sessionUser} room={room} activeHref="/kids" />

      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <KidsView initialKids={children} />
      </main>
    </div>
  );
}
