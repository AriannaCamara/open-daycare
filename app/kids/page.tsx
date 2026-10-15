import Link from "next/link";
import { Sidebar } from "@/app/_components/sidebar";
import { KidsDirectory } from "@/app/_components/kids-directory";
import { children } from "@/app/_data/children";
import { room, sessionUser } from "@/app/_data/feed";

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function KidsPage() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar user={sessionUser} room={room} activeHref="/kids" />

      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-[880px] px-10 pb-20 pt-[34px]">
          <div className="mb-[22px] flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
                GESTIÓN
              </div>
              <h1 className="m-0 font-display text-[30px] font-semibold text-ink">
                Niños
              </h1>
            </div>
            <Link
              href="/add-child"
              className="flex flex-none items-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.7)]"
            >
              <PlusIcon />
              Agregar niño
            </Link>
          </div>

          <KidsDirectory
            kids={children}
            separator={
              <div className="mb-3.5 flex items-center gap-3">
                <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-ink">
                  {room.roomName.toUpperCase()}
                </span>
                <span className="text-[13px] text-muted-strong">
                  {children.length} niños
                </span>
                <span className="h-px flex-1 bg-divider" />
              </div>
            }
          />
        </div>
      </main>
    </div>
  );
}
