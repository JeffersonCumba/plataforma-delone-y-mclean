"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterpretChartButton } from "@/app/dashboard/_components/interpret-chart-button";
import { InterpretationPanel } from "@/app/dashboard/_components/interpretation-panel";
import { type InterpretationHandle } from "@/hooks/use-interpretation";
import {
  type AnalyticsData,
  type SatisfactionPieDatum,
} from "@/types/analytics";
import { buildSatisfactionDistributionPrompt } from "@/app/dashboard/_components/chart-ai-prompts";

interface SatisfactionPieChartProps {
  data: SatisfactionPieDatum[];
  totalRespondents: number;
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  interp: InterpretationHandle;
}

interface CustomTooltipPayload {
  payload: SatisfactionPieDatum;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const datum = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-semibold text-slate-950">{datum.name}</p>
      <p className="text-xs text-slate-600">
        {datum.value} alumnos &mdash; {datum.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

export function SatisfactionPieChart({
  data,
  totalRespondents,
  courseId,
  courseName,
  analytics,
  interp,
}: SatisfactionPieChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  const isEmpty = total === 0;

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">
              Distribución de Niveles de Satisfacción
            </CardTitle>
            <p className="text-sm text-slate-600">
              Clasificación demográfica de los estudiantes según su promedio en
              la dimensión de satisfacción del usuario.
            </p>
          </div>
          <InterpretChartButton
            onClick={() =>
              interp.interpret(
                buildSatisfactionDistributionPrompt(courseName, analytics),
              )
            }
            hidden={isEmpty || interp.isLoading}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-90 w-full">
          {isEmpty ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Aún no hay datos de satisfacción para clasificar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isAnimationActive
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value, entry) => {
                    const datum = entry.payload as SatisfactionPieDatum | undefined;
                    const pct = datum ? datum.percentage.toFixed(1) : "0.0";
                    return `${value} (${pct}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {total} usuario{total === 1 ? "" : "s"} clasificados de {totalRespondents} matriculados.
        </p>
        <InterpretationPanel
          text={interp.text}
          isLoading={interp.isLoading}
          error={interp.error}
          onClose={interp.reset}
        />
      </CardContent>
    </Card>
  );
}
