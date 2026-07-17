"use client";

import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnalyticsData } from "@/types/analytics";
import { type InterpretationHandle } from "@/hooks/use-interpretation";
import {
  buildBetasPrompt,
  buildCriticalQuestionsPrompt,
  buildDescriptivePrompt,
  buildFrequenciesPrompt,
  buildSatisfactionDistributionPrompt,
} from "@/app/dashboard/_components/chart-ai-prompts";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://localhost:8000";

interface ExportPdfRequest {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  aiInterpretations: {
    satisfaction: string;
    descriptive: string;
    betas: string;
    frequencies: string;
    critical: string;
  };
}

interface ExportPdfButtonProps {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  satisfactionInterp: InterpretationHandle;
  descriptiveInterp: InterpretationHandle;
  betasInterp: InterpretationHandle;
  frequenciesInterp: InterpretationHandle;
  criticalInterp: InterpretationHandle;
  hidden?: boolean;
}

const MAX_TEXT_LENGTH = 5000;

function truncateForUrl(text: string, max = MAX_TEXT_LENGTH): string {
  return text.length > max ? text.slice(0, max) : text;
}

function buildExportPayload(
  courseId: number,
  courseName: string,
  analytics: AnalyticsData,
  texts: {
    satisfaction: string;
    descriptive: string;
    betas: string;
    frequencies: string;
    critical: string;
  },
): ExportPdfRequest {
  return {
    courseId,
    courseName,
    analytics,
    aiInterpretations: texts,
  };
}

export function ExportPdfButton({
  courseId,
  courseName,
  analytics,
  satisfactionInterp,
  descriptiveInterp,
  betasInterp,
  frequenciesInterp,
  criticalInterp,
  hidden = false,
}: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (hidden) {
    return null;
  }

  function snapshotTexts() {
    return {
      satisfaction: satisfactionInterp.text,
      descriptive: descriptiveInterp.text,
      betas: betasInterp.text,
      frequencies: frequenciesInterp.text,
      critical: criticalInterp.text,
    };
  }

  async function triggerDownload(payload: ExportPdfRequest): Promise<void> {
    setIsExporting(true);
    try {
      const response = await fetch(`${PYTHON_API_URL}/api/export/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => ({}))) as { detail?: string; message?: string };
        throw new Error(
          payload.detail ?? payload.message ?? "No se pudo generar el reporte PDF",
        );
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  function handleDirectClick(): void {
    const payload = buildExportPayload(courseId, courseName, analytics, snapshotTexts());
    void triggerDownload(payload);
  }

  async function handleGenerateAndExport(): Promise<void> {
    setIsGenerating(true);
    try {
      const [satisfaction, descriptive, betas, frequencies, critical] =
        await Promise.all([
          satisfactionInterp.interpret(
            buildSatisfactionDistributionPrompt(courseName, analytics),
          ),
          descriptiveInterp.interpret(
            buildDescriptivePrompt(courseName, analytics),
          ),
          betasInterp.interpret(buildBetasPrompt(courseName, analytics)),
          frequenciesInterp.interpret(
            buildFrequenciesPrompt(courseName, analytics),
          ),
          criticalInterp.interpret(
            buildCriticalQuestionsPrompt(courseName, analytics),
          ),
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al generar interpretaciones";
      toast.error(message);
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
      texts.satisfaction &&
        texts.descriptive &&
        texts.betas &&
        texts.frequencies &&
        texts.critical,
    );
    if (allFilled) {
      handleDirectClick();
    } else {
      setShowConfirmDialog(true);
    }
  }

  const buttonLabel = isExporting
    ? "Generando PDF..."
    : isGenerating
      ? "Generando interpretaciones..."
      : "Descargar reporte (PDF)";

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isExporting || isGenerating}
      >
        {isExporting || isGenerating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        {buttonLabel}
      </Button>

      <Dialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          if (!isGenerating) {
            setShowConfirmDialog(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              Faltan interpretaciones de IA
            </DialogTitle>
            <DialogDescription>
              Aun no has generado las interpretaciones de IA para los 5
              analisis de este curso. ¿Deseas generarlas ahora e incluirlas
              en el reporte PDF?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleExportWithoutIA}
              disabled={isGenerating}
            >
              Exportar sin IA
            </Button>
            <Button
              onClick={handleGenerateAndExport}
              disabled={isGenerating}
              className="bg-cyan-600 text-white hover:bg-cyan-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar y exportar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}