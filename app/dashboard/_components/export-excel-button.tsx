"use client";

import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { AnalyticsData } from "@/types/analytics";
import type { ExportVariant } from "@/types/export";

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
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
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
        throw new Error("No se pudo exportar el Excel");
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

      toast.success("Excel exportado correctamente");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.error("La exportación tardó demasiado, intenta de nuevo");
      } else {
        toast.error("No se pudo exportar el Excel");
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
        Excel
      </DropdownMenuItem>
    );
  }

  return (
    <Button onClick={handleExport} disabled={isExporting}>
      {isExporting ? <Spinner className="mr-2 h-4 w-4" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
      {isExporting ? "Exportando..." : "Exportar reporte (Excel)"}
    </Button>
  );
}
