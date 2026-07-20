"use client";

import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/constants";

interface TrialTimerProps {
  daysRemaining: number;
  isExpired: boolean;
  isWarningPeriod: boolean;
  trialEndsAt: Date | null;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  trialDays?: number;
  warningDays?: number;
}

function getColorClasses(
  daysRemaining: number,
  isExpired: boolean,
  isWarningPeriod: boolean,
) {
  if (isExpired) return "bg-rose-500";
  if (isWarningPeriod) return "bg-amber-500";
  if (daysRemaining > 20) return "bg-emerald-500";
  if (daysRemaining > 10) return "bg-cyan-500";
  return "bg-blue-500";
}

function getTextColorClasses(isExpired: boolean, isWarningPeriod: boolean) {
  if (isExpired) return "text-rose-600";
  if (isWarningPeriod) return "text-slate-600";
  return "text-slate-600";
}

function getIcon(
  isExpired: boolean,
  isWarningPeriod: boolean,
  size: "sm" | "md" | "lg" = "md",
) {
  const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" }[size];
  if (isExpired) return <XCircle className={cn(iconSize, "text-rose-500")} />;
  if (isWarningPeriod)
    return (
      <AlertTriangle
        className={cn(iconSize, "text-yellow-500 animate-pulse")}
        style={{ animationIterationCount: 1 }}
      />
    );
  return <Clock className={cn(iconSize, "text-cyan-500")} />;
}

const sizeConfig = {
  sm: {
    trackHeight: "h-2",
    font: "text-xs font-medium",
    gap: "gap-1.5",
    iconSize: "sm" as const,
  },
  md: {
    trackHeight: "h-3",
    font: "text-sm font-medium",
    gap: "gap-2",
    iconSize: "md" as const,
  },
  lg: {
    trackHeight: "h-4",
    font: "text-base font-semibold",
    gap: "gap-2.5",
    iconSize: "lg" as const,
  },
};

export function TrialTimer({
  daysRemaining,
  isExpired,
  isWarningPeriod,
  trialEndsAt,
  showLabel = true,
  size = "md",
  className,
  trialDays = TRIAL_DAYS,
}: TrialTimerProps) {
  const progress = isExpired
    ? 0
    : Math.max(0, Math.min(1, daysRemaining / trialDays));
  const percentage = Math.round(progress * 100);

  const cfg = sizeConfig[size];
  const colorClass = getColorClasses(daysRemaining, isExpired, isWarningPeriod);
  const textColorClass = getTextColorClasses(isExpired, isWarningPeriod);

  return (
    <div className={cn("flex items-center", cfg.gap, className)}>
      <div
        className="flex-1 min-w-0 relative"
        style={{
          maxWidth: size === "sm" ? "120px" : size === "md" ? "160px" : "200px",
        }}
      >
        <div
          className={cn(
            "relative rounded-full bg-slate-200 overflow-hidden",
            cfg.trackHeight,
          )}
        >
          <div
            className={cn(
              "absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500",
              colorClass,
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap",
          textColorClass,
        )}
      >
        {getIcon(isExpired, isWarningPeriod, cfg.iconSize)}
        <span className={cn(cfg.font, "tabular-nums")}>
          {isExpired ? "Expirado" : `${daysRemaining}d`}
        </span>
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 hidden sm:inline-block whitespace-nowrap">
          {isExpired
            ? "Prueba finalizada"
            : isWarningPeriod
              ? `¡Quedan ${daysRemaining} días!`
              : "Días restantes"}
        </span>
      )}
      {trialEndsAt && !isExpired && showLabel && (
        <span className="text-[10px] text-slate-400 hidden md:inline-block ml-1 whitespace-nowrap">
          Expira:{" "}
          {trialEndsAt.toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      )}
    </div>
  );
}

export function TrialTimerHorizontal({
  daysRemaining,
  isExpired,
  isWarningPeriod,
  showLabel = true,
  className,
  trialDays = TRIAL_DAYS,
}: Omit<TrialTimerProps, "size">) {
  const progress = isExpired
    ? 0
    : Math.max(0, Math.min(1, daysRemaining / trialDays));
  const percentage = Math.round(progress * 100);

  const colorClass = getColorClasses(daysRemaining, isExpired, isWarningPeriod);
  const textColorClass = getTextColorClasses(isExpired, isWarningPeriod);

  return (
    <div className={cn("flex items-center gap-3 w-full max-w-xs", className)}>
      <div className="flex-1 relative h-3 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={cn(
            "absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500",
            colorClass,
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={cn("flex items-center gap-1.5", textColorClass)}>
        {getIcon(isExpired, isWarningPeriod, "md")}
        <span className="text-sm font-medium">
          {isExpired ? "Expirado" : `${daysRemaining}d`}
        </span>
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 hidden sm:inline">
          {isExpired
            ? "Prueba finalizada"
            : isWarningPeriod
              ? `¡Quedan ${daysRemaining} días!`
              : "Días restantes"}
        </span>
      )}
    </div>
  );
}
