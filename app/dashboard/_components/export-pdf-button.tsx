"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnalyticsData } from "@/types/analytics";
import type { ExportVariant } from "@/types/export";
import { type InterpretationHandle } from "@/hooks/use-interpretation";
import {
  buildBetasPrompt,
  buildCriticalQuestionsPrompt,
  buildDescriptivePrompt,
  buildFrequenciesPrompt,
  buildSatisfactionDistributionPrompt,
} from "@/app/dashboard/_components/chart-ai-prompts";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://localhost:8000";
const EXPORT_TIMEOUT = 30000;

interface ExportPdfButtonProps {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  satisfactionInterp: InterpretationHandle;
  descriptiveInterp: InterpretationHandle;
  betasInterp: InterpretationHandle;
  frequenciesInterp: InterpretationHandle;
  criticalInterp: InterpretationHandle;
  variant?: ExportVariant;
  onStatusChange?: (exporting: boolean) => void;
}

export interface ExportPdfHandle {
  handleClick: () => void;
}

function buildExportPayload(
  courseId: number,
  courseName: string,
  analytics: AnalyticsData,
  texts: { satisfaction: string; descriptive: string; betas: string; frequencies: string; critical: string },
) {
  return { courseId, courseName, analytics, aiInterpretations: texts };
}

export const ExportPdfButton = forwardRef<ExportPdfHandle, ExportPdfButtonProps>(function ExportPdfButton(
  {
    courseId,
    courseName,
    analytics,
    satisfactionInterp,
    descriptiveInterp,
    betasInterp,
    frequenciesInterp,
    criticalInterp,
    variant = "button",
    onStatusChange,
  },
  ref,
) {
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  function snapshotTexts() {
    return {
      satisfaction: satisfactionInterp.text,
      descriptive: descriptiveInterp.text,
      betas: betasInterp.text,
      frequencies: frequenciesInterp.text,
      critical: criticalInterp.text,
    };
  }

  async function triggerDownload(payload: Record<string, unknown>): Promise<void> {
    setIsExporting(true);
    onStatusChange?.(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPORT_TIMEOUT);

    try {
      const response = await fetch(`${PYTHON_API_URL}/api/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("No se pudo generar el reporte PDF");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      const safeName = courseName.replace(/[^a-zA-Z0-9_\-\s]/g, "_");
      anchor.download = `reporte_dlm_curso_${courseId}_${safeName}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      toast.success("PDF exportado correctamente");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.error("La exportación tardó demasiado, intenta de nuevo");
      } else {
        toast.error("No se pudo generar el reporte PDF");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsExporting(false);
      onStatusChange?.(false);
    }
  }

  function handleDirectClick(): void {
    const payload = buildExportPayload(courseId, courseName, analytics, snapshotTexts());
    void triggerDownload(payload);
  }

  async function handleGenerateAndExport(): Promise<void> {
    setIsGenerating(true);
    try {
      const [satisfaction, descriptive, betas, frequencies, critical] = await Promise.all([
        satisfactionInterp.interpret(buildSatisfactionDistributionPrompt(courseName, analytics)),
        descriptiveInterp.interpret(buildDescriptivePrompt(courseName, analytics)),
        betasInterp.interpret(buildBetasPrompt(courseName, analytics)),
        frequenciesInterp.interpret(buildFrequenciesPrompt(courseName, analytics)),
        criticalInterp.interpret(buildCriticalQuestionsPrompt(courseName, analytics)),
      ]);
      setShowConfirmDialog(false);
      const payload = buildExportPayload(courseId, courseName, analytics, {
        satisfaction,
        descriptive,
        betas,
        frequencies,
        critical,
      });
      await triggerDownload(payload);
    } catch {
      toast.error("Error al generar interpretaciones");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExportWithoutIA(): void {
    setShowConfirmDialog(false);
    const payload = buildExportPayload(courseId, courseName, analytics, snapshotTexts());
    void triggerDownload(payload);
  }

  function handleClick(): void {
    const texts = snapshotTexts();
    const allFilled = Boolean(
      texts.satisfaction && texts.descriptive && texts.betas && texts.frequencies && texts.critical,
    );
    if (allFilled) {
      handleDirectClick();
    } else {
      setShowConfirmDialog(true);
    }
  }

  useImperativeHandle(ref, () => ({ handleClick }));

  return (
    <>
      {variant !== "dropdown-item" && (
        <Button onClick={handleClick} disabled={isExporting || isGenerating}>
          {isExporting || isGenerating ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          {isExporting ? "Generando PDF..." : isGenerating ? "Generando interpretaciones..." : "Descargar reporte (PDF)"}
        </Button>
      )}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => { if (!isGenerating) setShowConfirmDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              Faltan interpretaciones de IA
            </DialogTitle>
            <DialogDescription>
              Aun no has generado las interpretaciones de IA para los 5 analisis de este curso.
              {" "}¿Deseas generarlas ahora e incluirlas en el reporte PDF?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleExportWithoutIA} disabled={isGenerating}>
              Exportar sin IA
            </Button>
            <Button onClick={handleGenerateAndExport} disabled={isGenerating} className="bg-cyan-600 text-white hover:bg-cyan-700">
              {isGenerating ? (
                <><Spinner className="mr-2 h-4 w-4" /> Generando...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generar y exportar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
