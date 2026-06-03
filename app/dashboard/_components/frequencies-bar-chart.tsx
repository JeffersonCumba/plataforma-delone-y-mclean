"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterpretChartButton } from "@/app/dashboard/_components/interpret-chart-button";
import {
  LIKERT_LABELS,
  type DimensionKey,
  type QuestionFrequency,
} from "@/types/analytics";

interface FrequenciesBarChartProps {
  data: QuestionFrequency[];
  onInterpret: () => void;
}

const LIKERT_COLORS: Record<(typeof LIKERT_LABELS)[number], string> = {
  "Totalmente en desacuerdo": "#dc2626",
  "En desacuerdo": "#f97316",
  Neutral: "#eab308",
  "De acuerdo": "#14b8a6",
  "Totalmente de acuerdo": "#10b981",
};

const DIMENSION_SHORT: Record<DimensionKey, string> = {
  calidad_sys: "Sis",
  calidad_info: "Inf",
  calidad_serv: "Serv",
  uso_sistema: "Uso",
  satis_user: "Sat",
  benef_netos: "Net",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: QuestionFrequency;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const datum = payload[0]?.payload;
  const total = payload.reduce((acc, entry) => acc + (entry.value ?? 0), 0);

  return (
    <div className="max-w-xs rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-950">
        {label}
        {datum ? ` — ${datum.questionText}` : ""}
      </p>
      {datum ? (
        <p className="mt-0.5 text-xs text-slate-500">
          Dimensión: {DIMENSION_SHORT[datum.dimension]} · n = {total}
        </p>
      ) : null}
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => (
          <li
            key={entry.dataKey}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex items-center gap-1.5 text-slate-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-slate-950">
              {entry.value} ({total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0"}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FrequenciesBarChart({ data, onInterpret }: FrequenciesBarChartProps) {
  const isEmpty = data.length === 0;

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">
              Histograma de Frecuencias por Pregunta
            </CardTitle>
            <p className="text-sm text-slate-600">
              Distribución de respuestas Likert (1 a 5) para cada pregunta del
              cuestionario DeLone y McLean.
            </p>
          </div>
          <InterpretChartButton onClick={onInterpret} />
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            Sin datos de preguntas para graficar.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="min-w-250">
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    margin={{ top: 12, right: 16, left: 4, bottom: 8 }}
                    barCategoryGap="14%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="pregunta"
                      tick={{ fill: "#475569", fontSize: 11 }}
                      stroke="#cbd5e1"
                      interval={0}
                      angle={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#475569", fontSize: 11 }}
                      stroke="#cbd5e1"
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(15, 118, 110, 0.06)" }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={32}
                      iconType="square"
                      wrapperStyle={{ fontSize: 11, color: "#475569" }}
                    />
                    {LIKERT_LABELS.map((label) => (
                      <Bar
                        key={label}
                        dataKey={label}
                        name={label}
                        fill={LIKERT_COLORS[label]}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={28}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          {data.length} pregunta{data.length === 1 ? "" : "s"} procesadas.
          Desplaza horizontalmente para ver todas las preguntas.
        </p>
      </CardContent>
    </Card>
  );
}
