"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://localhost:8000";

interface ExportExcelRequest {
  courseId: number;
  courseName: string;
  analytics: {
    totalSurveys: number;
    totalRespondents: number;
    responseRate: number;
    cronbachAlpha: number;
    promediosDimensiones: Record<string, number>;
    dimensionChartData: Array<{ name: string; score: number; fill: string }>;
    betaCoefficients: Array<{ key: string; name: string; value: number; fill: string }>;
    criticalQuestions: Array<{ question: string; dimension: string; average: number }>;
    satisfactionDistribution: Array<{ name: string; value: number; percentage: number; color: string }>;
    questionFrequencies: Array<{
      pregunta: string;
      questionId: number;
      questionText: string;
      dimension: string;
      "Totalmente en desacuerdo": number;
      "En desacuerdo": number;
      Neutral: number;
      "De acuerdo": number;
      "Totalmente de acuerdo": number;
    }>;
    deloneMcleanModel: {
      sampleSize: number;
      bootstrapSamples: number;
      structuralPaths: Array<{
        key: string;
        from: string;
        to: string;
        name: string;
        coefficient: number;
        ciLow: number;
        ciHigh: number;
        significant: boolean;
      }>;
      constructReliability: Array<{
        dimension: string;
        name: string;
        itemCount: number;
        cronbachAlpha: number;
        compositeReliability: number;
        ave: number;
      }>;
      discriminantValidity: Array<{
        left: string;
        right: string;
        leftName: string;
        rightName: string;
        correlation: number;
        sqrtAveLeft: number;
        sqrtAveRight: number;
        passesFornellLarcker: boolean;
      }>;
      rSquared: Record<string, number>;
    };
  };
}

export function ExportColabButton({ 
  courseId, 
  courseName, 
  analytics 
}: { 
  courseId: number; 
  courseName: string; 
  analytics: ExportExcelRequest["analytics"];
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);

    try {
      const payload: ExportExcelRequest = {
        courseId,
        courseName,
        analytics,
      };

      const response = await fetch(`${PYTHON_API_URL}/api/export/excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const fallbackMessage = "No se pudo exportar el Excel";
        try {
          const payload = (await response.json()) as { detail?: string; message?: string };
          throw new Error(payload.detail ?? payload.message ?? fallbackMessage);
        } catch {
          throw new Error(fallbackMessage);
        }
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
      const message =
        error instanceof Error ? error.message : "No se pudo exportar el Excel";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={isExporting}>
      <FileSpreadsheet className="mr-2 h-4 w-4" />
      {isExporting ? "Exportando..." : "Exportar reporte (Excel)"}
    </Button>
  );
}
