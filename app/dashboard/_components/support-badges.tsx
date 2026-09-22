"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { SupportPriority, SupportStatus, SupportType } from "@/types/support";

const statusClasses: Record<SupportStatus, string> = {
  OPEN: "bg-sky-50 text-sky-700 ring-sky-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-200",
};

const priorityClasses: Record<SupportPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
};

const typeClasses: Record<SupportType, string> = {
  BUG: "bg-violet-50 text-violet-700 ring-violet-200",
  ERROR: "bg-rose-50 text-rose-700 ring-rose-200",
  QUESTION: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  SUGGESTION: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  const t = useTranslations("support");
  return <Badge className={statusClasses[status]}>{t(`statuses.${status}`)}</Badge>;
}

export function SupportPriorityBadge({ priority }: { priority: SupportPriority }) {
  const t = useTranslations("support");
  return <Badge className={priorityClasses[priority]}>{t(`priorities.${priority}`)}</Badge>;
}

export function SupportTypeBadge({ type }: { type: SupportType }) {
  const t = useTranslations("support");
  return <Badge className={typeClasses[type]}>{t(`types.${type}`)}</Badge>;
}
