"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Percent,
  Printer,
  ShieldCheck,
  Smile,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type AnalyticsData,
  type AnalyticsQuestionAlert,
} from "@/types/analytics";
import { ExportColabButton } from "@/app/dashboard/_components/export-colab-button";
import { ExportOdtButton } from "@/app/dashboard/_components/export-odt-button";
import { InterpretChartButton } from "@/app/dashboard/_components/interpret-chart-button";
import { InterpretationPanel } from "@/app/dashboard/_components/interpretation-panel";
import { SatisfactionPieChart } from "@/app/dashboard/_components/satisfaction-pie-chart";
import { FrequenciesBarChart } from "@/app/dashboard/_components/frequencies-bar-chart";
import {
  buildBetasPrompt,
  buildCriticalQuestionsPrompt,
  buildDescriptivePrompt,
  buildFrequenciesPrompt,
  buildSatisfactionDistributionPrompt,
} from "@/app/dashboard/_components/chart-ai-prompts";
import { useInterpretation } from "@/hooks/use-interpretation";

const DIMENSIONS_MAP = {
  calidad_sys: "Calidad del Sistema",
  calidad_info: "Calidad de la Información",
  calidad_serv: "Calidad del Servicio",
  uso_sistema: "Uso del Sistema",
  satis_user: "Satisfacción del Usuario",
  benef_netos: "Beneficios Netos",
};

function KpiCard({
  icon,
  label,
  value,
  description,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <div className="text-3xl font-semibold tracking-tight text-slate-950">
              {value}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            {icon}
          </div>
        </div>
        <p className="text-sm text-slate-500">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function AlertRow({ item }: { item: AnalyticsQuestionAlert }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-950">
            {item.question}
          </p>
          <p className="text-sm text-slate-600">
            Dimensión: {DIMENSIONS_MAP[item.dimension]}
          </p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
          {item.average.toFixed(2)} / 5.0
        </div>
      </div>
    </div>
  );
}

export function CourseAnalyticsPanel({
  courseId,
  courseName,
  analytics,
}: {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
}) {
  return (
    <CourseAnalyticsContent
      courseId={courseId}
      courseName={courseName}
      analytics={analytics}
    />
  );
}

function CourseAnalyticsContent({
  courseId,
  courseName,
  analytics,
}: {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
}) {
  const interpretationContext = { courseId, courseName, analytics };
  const satisfactionInterp = useInterpretation({
    ...interpretationContext,
    slot: "satisfaction",
  });
  const descriptiveInterp = useInterpretation({
    ...interpretationContext,
    slot: "descriptive",
  });
  const betasInterp = useInterpretation({
    ...interpretationContext,
    slot: "betas",
  });
  const frequenciesInterp = useInterpretation({
    ...interpretationContext,
    slot: "frequencies",
  });
  const criticalInterp = useInterpretation({
    ...interpretationContext,
    slot: "critical",
  });

  const betaDomain = useMemo(() => {
    const values = analytics.betaCoefficients.map((entry) => entry.value);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);
    const padding = Math.max(Math.abs(maxValue), Math.abs(minValue), 0.1) * 1.2;

    return [
      Math.min(0, minValue - padding * 0.15),
      Math.max(0, maxValue + padding * 0.15),
    ];
  }, [analytics.betaCoefficients]);

  return (
    <section className="space-y-6">
      <Card className="border-slate-200/80 bg-linear-to-br from-white via-slate-50 to-cyan-50 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Button
              asChild
              variant="ghost"
              className="w-fit px-0 text-slate-600 hover:bg-transparent hover:text-slate-950"
            >
              <Link href="/dashboard/cursos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Cursos
              </Link>
            </Button>
            <div className="space-y-1">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
                Reporte analítico
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
                {courseName}
              </h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Vista integral de calidad, satisfacción, causalidad y alertas
                críticas del cuestionario DeLone y McLean.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportColabButton courseId={courseId} />
            <ExportOdtButton
              courseId={courseId}
              courseName={courseName}
              analytics={analytics}
              satisfactionInterp={satisfactionInterp}
              descriptiveInterp={descriptiveInterp}
              betasInterp={betasInterp}
              frequenciesInterp={frequenciesInterp}
              criticalInterp={criticalInterp}
              hidden={analytics.totalSurveys === 0}
            />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Muestra Actual"
          value={analytics.totalSurveys}
          description="Encuestas completadas y disponibles para el análisis."
        />

        <KpiCard
          icon={<Percent className="h-5 w-5" />}
          label="Participación"
          value={`${analytics.responseRate.toFixed(1)}%`}
          description={`Respondieron ${analytics.totalSurveys} de ${analytics.totalRespondents} participantes.`}
        >
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full gap-1 p-0.5">
                {Array.from({ length: 10 }).map((_, index) => {
                  const filledSegments = Math.max(
                    1,
                    Math.round(Math.min(100, analytics.responseRate) / 10),
                  );
                  return (
                    <div
                      key={index}
                      className={`h-full flex-1 rounded-full transition-colors ${
                        index < filledSegments ? "bg-cyan-600" : "bg-slate-200"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Cobertura de respuesta sobre la población matriculada.
            </p>
          </div>
        </KpiCard>

        <KpiCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Fiabilidad General (alfa de Cronbach)"
          value={analytics.cronbachAlpha.toFixed(3)}
          description="Consistencia interna global del cuestionario."
        >
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              analytics.cronbachAlpha >= 0.7
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200"
            }`}
          >
            {analytics.cronbachAlpha >= 0.7 ? "Adecuada" : "Revisar"}
          </span>
        </KpiCard>

        <KpiCard
          icon={<Smile className="h-5 w-5" />}
          label="Satisfacción Promedio"
          value={`${formatScore(analytics.promediosDimensiones.satis_user)} / 5.0`}
          description="Valor medio de la dimensión de satisfacción del usuario."
        />
      </div>

      <SatisfactionPieChart
        data={analytics.satisfactionDistribution}
        totalRespondents={analytics.totalRespondents}
        courseId={courseId}
        courseName={courseName}
        analytics={analytics}
        interp={satisfactionInterp}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-xl">Análisis Descriptivo</CardTitle>
              <InterpretChartButton
                onClick={() =>
                  descriptiveInterp.interpret(
                    buildDescriptivePrompt(courseName, analytics),
                  )
                }
                hidden={
                  analytics.totalSurveys === 0 || descriptiveInterp.isLoading
                }
              />
            </div>
            <p className="text-sm text-slate-600">
              Promedio por dimensión DeLone y McLean (escala Likert 1-5).
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-90 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.dimensionChartData}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#475569", fontSize: 12 }}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 5]}
                    tickCount={6}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      Number(value).toFixed(2),
                      "Promedio",
                    ]}
                  />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} maxBarSize={72}>
                    {analytics.dimensionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <InterpretationPanel
              text={descriptiveInterp.text}
              isLoading={descriptiveInterp.isLoading}
              error={descriptiveInterp.error}
              onClose={descriptiveInterp.reset}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-xl">
                Análisis Predictivo / Causal
              </CardTitle>
              <InterpretChartButton
                onClick={() =>
                  betasInterp.interpret(buildBetasPrompt(courseName, analytics))
                }
                hidden={analytics.totalSurveys === 0 || betasInterp.isLoading}
              />
            </div>
            <p className="text-sm text-slate-600">
              Coeficientes beta ordenados de mayor a menor impacto sobre la
              satisfacción.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-90 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.betaCoefficients}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={betaDomain as [number, number]}
                    tickFormatter={(value) => Number(value).toFixed(2)}
                  />
                  <YAxis type="category" dataKey="name" width={180} />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(3), "Beta"]}
                  />
                  <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                    {analytics.betaCoefficients.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <InterpretationPanel
              text={betasInterp.text}
              isLoading={betasInterp.isLoading}
              error={betasInterp.error}
              onClose={betasInterp.reset}
            />
          </CardContent>
        </Card>
      </div>

      <FrequenciesBarChart
        data={analytics.questionFrequencies}
        courseId={courseId}
        courseName={courseName}
        analytics={analytics}
        interp={frequenciesInterp}
      />

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl">Preguntas Críticas</CardTitle>
            <InterpretChartButton
              onClick={() =>
                criticalInterp.interpret(
                  buildCriticalQuestionsPrompt(courseName, analytics),
                )
              }
              hidden={
                analytics.criticalQuestions.length === 0 ||
                criticalInterp.isLoading
              }
            />
          </div>
          <p className="text-sm text-slate-600">
            Las tres preguntas con promedio individual por debajo de 3.0.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.criticalQuestions.length > 0 ? (
              analytics.criticalQuestions.map((item) => (
                <AlertRow
                  key={`${item.dimension}-${item.question}`}
                  item={item}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
                No se detectaron preguntas críticas por debajo del umbral.
              </div>
            )}
          </div>
          <InterpretationPanel
            text={criticalInterp.text}
            isLoading={criticalInterp.isLoading}
            error={criticalInterp.error}
            onClose={criticalInterp.reset}
          />
        </CardContent>
      </Card>
    </section>
  );
}
