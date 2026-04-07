"use client";

import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarUserFooter({ userName }: { userName: string }) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_id");
    router.push("/logout");
  };

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={userName}
            className="h-auto items-center justify-start gap-3 px-3 py-2"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {userName}
              </span>
              <span className="block text-xs text-sidebar-foreground/70">
                Perfil activo
              </span>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Cerrar sesion"
            variant="outline"
            className="h-auto items-center justify-start gap-3 px-3 py-2"
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
