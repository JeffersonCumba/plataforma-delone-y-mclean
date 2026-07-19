"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ExportExcelButton } from "@/app/dashboard/_components/export-excel-button";
import { ExportPdfButton, type ExportPdfHandle } from "@/app/dashboard/_components/export-pdf-button";
import { ExportOdtButton, type ExportOdtHandle } from "@/app/dashboard/_components/export-odt-button";
import type { AnalyticsData } from "@/types/analytics";
import type { InterpretationHandle } from "@/hooks/use-interpretation";

interface ExportDropdownProps {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  satisfactionInterp: InterpretationHandle;
  descriptiveInterp: InterpretationHandle;
  betasInterp: InterpretationHandle;
  frequenciesInterp: InterpretationHandle;
  criticalInterp: InterpretationHandle;
}

export function ExportDropdown({
  courseId,
  courseName,
  analytics,
  satisfactionInterp,
  descriptiveInterp,
  betasInterp,
  frequenciesInterp,
  criticalInterp,
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false);
  const hasData = analytics.totalSurveys > 0;

  const pdfRef = useRef<ExportPdfHandle>(null);
  const odtRef = useRef<ExportOdtHandle>(null);

  const shared = { courseId, courseName, analytics, satisfactionInterp, descriptiveInterp, betasInterp, frequenciesInterp, criticalInterp };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={!hasData || isExporting}
            className={!hasData ? "cursor-not-allowed opacity-50" : ""}
            title={!hasData ? "No hay datos para exportar" : "Exportar reportes"}
          >
            {isExporting ? <Spinner className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <ExportExcelButton variant="dropdown-item" courseId={courseId} courseName={courseName} analytics={analytics} onStatusChange={setIsExporting} />
          <DropdownMenuItem onSelect={() => pdfRef.current?.handleClick()}>
            <FileText className="h-4 w-4 text-red-600" />
            PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => odtRef.current?.handleClick()}>
            <FileText className="h-4 w-4 text-blue-600" />
            ODT
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportPdfButton variant="dropdown-item" {...shared} onStatusChange={setIsExporting} ref={pdfRef} />
      <ExportOdtButton variant="dropdown-item" {...shared} onStatusChange={setIsExporting} ref={odtRef} />
    </div>
  );
}
