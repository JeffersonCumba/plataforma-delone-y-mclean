"use client";

import { type ReactNode } from "react";

export function DashboardEntrance({ children }: { children: ReactNode }) {
  return <div className="animate-dashboard-entrance">{children}</div>;
}
