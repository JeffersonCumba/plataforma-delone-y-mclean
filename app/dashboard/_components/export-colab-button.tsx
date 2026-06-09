"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ExportColabButton({ courseId }: { courseId: number }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);

    try {
      const response = await fetch(`/api/cursos/${courseId}/export-csv`, {
        method: "GET",
      });

      if (!response.ok) {
        const fallbackMessage = "No se pudo exportar el CSV";
        try {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? fallbackMessage);
        } catch {
          throw new Error(fallbackMessage);
        }
      }

      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `curso-${courseId}-respuestas.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast.success("CSV exportado correctamente");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo exportar el CSV";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isExporting}>
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exportando..." : "Exportar resultados (CSV)"}
    </Button>
  );
}
