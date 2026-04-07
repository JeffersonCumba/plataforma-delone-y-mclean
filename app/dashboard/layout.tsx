import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  FolderClosed,
  GraduationCap,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SidebarUserFooter } from "@/app/dashboard/_components/sidebar-user-footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
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
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-2">
            <GraduationCap className="h-4 w-4" />
            <span className="text-sm font-medium">Dashboard</span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Resumen</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/cursos">
                      <FolderClosed className="h-4 w-4" />
                      <span>Cursos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/encuestados">
                      <UsersRound className="h-4 w-4" />
                      <span>Encuestados</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarUserFooter userName={userName} />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div>
              <p className="text-sm text-slate-500">Dashboard principal</p>
              <p className="text-sm font-medium text-slate-900">{userName}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-100/70 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
