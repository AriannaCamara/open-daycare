import { Suspense } from "react";
import { AppSidebar, SidebarFallback } from "@/app/_components/app-sidebar";
import { room } from "@/app/_data/feed";
import { KidsViewServer } from "./kids-view-server";

function KidsFallback() {
  return (
    <div className="mx-auto w-full max-w-[880px] px-10 pb-20 pt-[34px]">
      <div className="mb-[22px] h-[52px] w-full max-w-[280px] animate-pulse rounded-[14px] bg-[#EFE3D5]" />
      <div className="mb-[22px] h-[48px] w-full animate-pulse rounded-[14px] bg-[#EFE3D5]" />
      <div className="h-[120px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
    </div>
  );
}

export default function KidsPage() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Suspense fallback={<SidebarFallback />}>
        <AppSidebar room={room} activeHref="/kids" />
      </Suspense>

      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <Suspense fallback={<KidsFallback />}>
          <KidsViewServer />
        </Suspense>
      </main>
    </div>
  );
}
