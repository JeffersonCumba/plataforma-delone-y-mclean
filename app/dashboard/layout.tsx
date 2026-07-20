import { requireAuth } from "@/lib/auth";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/app/dashboard/_components/dashboard-sidebar";
import { GoogleTranslateWidget } from "@/components/google-translate-widget";
import { DashboardEntrance } from "@/components/dashboard-entrance";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, role, userName } = await requireAuth();

  return (
    <SidebarProvider>
      <DashboardSidebar role={role} userName={userName} userId={userId} />

      <SidebarInset>
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 lg:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <div>
                <p className="text-sm font-medium text-slate-900">{userName}</p>
              </div>
            </div>

            <div className="flex w-full max-w-sm justify-end">
              <GoogleTranslateWidget />
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-100/70 p-4 lg:p-6">
          <DashboardEntrance>{children}</DashboardEntrance>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}