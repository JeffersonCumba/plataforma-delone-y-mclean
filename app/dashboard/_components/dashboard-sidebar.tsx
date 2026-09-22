"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FolderClosed,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  UserCheck,
  UsersRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { SidebarUserFooter } from "@/app/dashboard/_components/sidebar-user-footer";

export function DashboardSidebar({
  role,
  userName,
  userId,
  openSupportTickets,
}: {
  role: "ADMIN" | "EVALUADOR";
  userName: string;
  userId: number;
  openSupportTickets: number;
}) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const linkClass = cn(
    sidebarMenuButtonVariants(),
    "[&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  );

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-2">
          <GraduationCap className="h-4 w-4" />
          <span className="text-sm font-medium">{t("dashboard")}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {role === "EVALUADOR" && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href="/dashboard" className={linkClass}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t("summary")}</span>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/dashboard/cursos" className={linkClass}>
                    <FolderClosed className="h-4 w-4" />
                    <span>{t("courses")}</span>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/dashboard/encuestados" className={linkClass}>
                    <UsersRound className="h-4 w-4" />
                    <span>{t("encuestados")}</span>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link
                    href={`/dashboard/ayuda?from=${encodeURIComponent(pathname)}`}
                    className={linkClass}
                  >
                    <LifeBuoy className="h-4 w-4" />
                    <span>{t("help")}</span>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("administration")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href="/dashboard/admin" className={linkClass}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t("adminPanel")}</span>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/dashboard/admin/profesores" className={linkClass}>
                    <GraduationCap className="h-4 w-4" />
                    <span>{t("profesores")}</span>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/dashboard/admin/alumnos" className={linkClass}>
                    <UserCheck className="h-4 w-4" />
                    <span>{t("alumnos")}</span>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/dashboard/admin/cursos" className={linkClass}>
                    <BookOpen className="h-4 w-4" />
                    <span>{t("courses")}</span>
                  </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Link href="/dashboard/admin/soporte" className={linkClass}>
                    <LifeBuoy className="h-4 w-4" />
                    <span>{t("support")}</span>
                    {openSupportTickets > 0 && (
                      <span className="ml-auto rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        {openSupportTickets > 99 ? "99+" : openSupportTickets}
                      </span>
                    )}
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarUserFooter userName={userName} role={role} userId={userId} />
    </Sidebar>
  );
}
