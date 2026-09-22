"use client";

import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_DAYS } from "@/lib/constants";
import { useLocale, useTranslations } from "next-intl";

export interface TrialThermometerProps {
  daysRemaining: number;
  isExpired: boolean;
  isWarningPeriod: boolean;
  trialEndsAt: Date | null;
  showLabel?: boolean;
  showExpirationDate?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  trialDays?: number;
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

export function TrialThermometer({
  daysRemaining,
  isExpired,
  isWarningPeriod,
  trialEndsAt,
  showLabel = true,
  showExpirationDate = false,
  size = "md",
  className,
  trialDays = TRIAL_DAYS,
}: TrialThermometerProps) {
  const t = useTranslations("trial");
  const locale = useLocale();
  const safeTrialDays = Math.max(1, trialDays);
  const progress = isExpired
    ? 0
    : Math.max(0, Math.min(1, daysRemaining / safeTrialDays));
  const percentage = Math.round(progress * 100);

  const cfg = sizeConfig[size];
  const colorClass = getColorClasses(daysRemaining, isExpired, isWarningPeriod);
  const textColorClass = getTextColorClasses(isExpired, isWarningPeriod);

  return (
    <div className={cn("flex w-full min-w-0 items-center", cfg.gap, className)}>
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
          {isExpired ? t("expired") : t("daysShort", { days: daysRemaining })}
        </span>
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 hidden sm:inline-block whitespace-nowrap">
          {isExpired
            ? t("trialFinished")
            : isWarningPeriod
              ? t("daysRemainingWarning", { days: daysRemaining })
              : t("daysRemaining")}
        </span>
      )}
      {trialEndsAt && !isExpired && showLabel && showExpirationDate && (
        <span className="text-[10px] text-slate-400 hidden md:inline-block ml-1 whitespace-nowrap">
          {t("expiresOn")}{" "}
          {trialEndsAt.toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      )}
    </div>
  );
}
