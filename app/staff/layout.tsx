import { PanelSidebar } from "@/app/_components/panel-sidebar";
import { room } from "@/app/_data/feed";

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <div className="flex min-h-screen bg-cream">
      <PanelSidebar panel="staff" room={room} />
      {children}
    </div>
  );
}
