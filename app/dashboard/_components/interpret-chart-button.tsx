"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface InterpretChartButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  hidden?: boolean;
}

export function InterpretChartButton({
  onClick,
  label,
  className,
  hidden = false,
}: InterpretChartButtonProps) {
  const t = useTranslations("ia");
  const resolvedLabel = label ?? t("interpretWithIa");

  if (hidden) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={resolvedLabel}
      aria-label={resolvedLabel}
      className={cn(
        "ring ring-zinc-200 text-xs px-2.5",
        "inline-flex h-7 gap-1 items-center justify-center rounded-full text-black transition-all",
        "hover:text-cyan-800 hover:ring-cyan-300/60 hover:cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60",
        className,
      )}
    >
      {resolvedLabel}
      <Sparkles strokeWidth={1} className="h-4 w-4" />
    </button>
  );
}
