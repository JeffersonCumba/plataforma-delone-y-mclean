"use client";

import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { AnalyticsData } from "@/types/analytics";
import type { ExportVariant } from "@/types/export";
import { canExport } from "@/app/dashboard/_components/export-guard";
import { useTranslations } from "next-intl";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://localhost:8000";
const EXPORT_TIMEOUT = 30000;

interface ExportExcelButtonProps {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  variant?: ExportVariant;
  onStatusChange?: (exporting: boolean) => void;
}

export function ExportExcelButton({
  courseId,
  courseName,
  analytics,
  variant = "button",
  onStatusChange,
}: ExportExcelButtonProps) {
  const t = useTranslations("export");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!canExport(analytics.totalSurveys, t)) {
      return;
    }

    setIsExporting(true);
    onStatusChange?.(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPORT_TIMEOUT);

    try {
      const response = await fetch(`${PYTHON_API_URL}/api/export/excel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, courseName, analytics }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(t("exportExcelError"));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const safeName = courseName.replace(/[^a-zA-Z0-9_\-\s]/g, "_");
      anchor.download = `reporte_dlm_curso_${courseId}_${safeName}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success(t("excelExported"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.error(t("timeoutError"));
      } else {
        toast.error(t("exportExcelError"));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsExporting(false);
      onStatusChange?.(false);
    }
  };

  if (variant === "dropdown-item") {
    return (
      <DropdownMenuItem onSelect={handleExport} disabled={isExporting}>
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        {t("excel")}
      </DropdownMenuItem>
    );
  }

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      {isExporting ? <Spinner className="mr-2 h-4 w-4" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
      {isExporting ? t("exporting") : t("exportExcel")}
    </Button>
  );
}
