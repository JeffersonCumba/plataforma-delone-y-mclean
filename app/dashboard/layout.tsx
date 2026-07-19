import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/app/dashboard/_components/dashboard-sidebar";
import { GoogleTranslateWidget } from "@/components/google-translate-widget";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value as "ADMIN" | "EVALUADOR";
  const userNameCookie = cookieStore.get("user_name")?.value;
  const userIdCookie = cookieStore.get("user_id")?.value;

  if (!role) {
    redirect("/login");
  }

  const userId = Number(userIdCookie);
  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const userName = userNameCookie
    ? decodeURIComponent(userNameCookie)
    : "Profesor";

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

        <main className="flex-1 bg-slate-100/70 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}