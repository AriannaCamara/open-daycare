import { PanelSidebar } from "@/app/_components/panel-sidebar";

export default function FamilyLayout({ children }: LayoutProps<"/family">) {
  return (
    <div className="flex min-h-screen bg-cream">
      <PanelSidebar panel="family" />
      {children}
    </div>
  );
}
