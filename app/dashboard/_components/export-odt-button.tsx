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

interface ExportOdtButtonProps {
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

export interface ExportOdtHandle {
  handleClick: () => void;
}

const MAX_TEXT_LENGTH = 5000;

function truncateForUrl(text: string, max = MAX_TEXT_LENGTH): string {
  return text.length > max ? text.slice(0, max) : text;
}

function buildExportUrl(
  courseId: number,
  texts: { satisfaction: string; descriptive: string; betas: string; frequencies: string; critical: string },
): string {
  const params = new URLSearchParams({
    satisfaction: truncateForUrl(texts.satisfaction),
    descriptive: truncateForUrl(texts.descriptive),
    betas: truncateForUrl(texts.betas),
    frequencies: truncateForUrl(texts.frequencies),
    critical: truncateForUrl(texts.critical),
  });
  return `/api/cursos/${courseId}/export-odt?${params.toString()}`;
}

export const ExportOdtButton = forwardRef<ExportOdtHandle, ExportOdtButtonProps>(function ExportOdtButton(
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

  async function triggerDownload(url: string): Promise<void> {
    setIsExporting(true);
    onStatusChange?.(true);

    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        throw new Error("No se pudo generar el reporte ODT");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `Auditoria_Curso_${courseId}.odt`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
      toast.success("Reporte ODT exportado");
    } catch {
      toast.error("No se pudo generar el reporte ODT");
    } finally {
      setIsExporting(false);
      onStatusChange?.(false);
    }
  }

  function handleDirectClick(): void {
    const url = buildExportUrl(courseId, snapshotTexts());
    void triggerDownload(url);
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
      const url = buildExportUrl(courseId, { satisfaction, descriptive, betas, frequencies, critical });
      await triggerDownload(url);
    } catch {
      toast.error("Error al generar interpretaciones");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleExportWithoutIA(): void {
    setShowConfirmDialog(false);
    const url = buildExportUrl(courseId, snapshotTexts());
    void triggerDownload(url);
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
          {isExporting ? "Generando ODT..." : isGenerating ? "Generando interpretaciones..." : "Exportar reporte (ODT)"}
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
              {" "}¿Deseas generarlas ahora e incluirlas en el reporte ODT?
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
