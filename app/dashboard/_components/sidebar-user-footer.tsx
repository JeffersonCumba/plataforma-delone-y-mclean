"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface SidebarUserFooterProps {
  userName: string;
  role: "ADMIN" | "EVALUADOR";
  userId: number;
}

export function SidebarUserFooter({ userName, role, userId }: SidebarUserFooterProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_id");
    router.push("/logout");
  };

  const profileHref = "/dashboard/perfil";

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <Link
            href={profileHref}
            className={cn(
              sidebarMenuButtonVariants(),
              "h-auto items-center justify-start gap-3 px-3 py-2",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {userName}
              </span>
              <span className="block text-xs text-sidebar-foreground/70">
                Perfil
              </span>
            </span>
          </Link>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Cerrar sesion"
            variant="outline"
            className="h-auto items-center justify-start gap-3 px-3 py-2 cursor-pointer"
            onClick={handleLogout}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-sidebar-foreground">
              <LogOut className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
              Cerrar sesion
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
