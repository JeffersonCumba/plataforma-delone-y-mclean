"use client";

import { ClipboardList, Sigma, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ResponseMatrixData } from "@/types/analytics";

function answerTone(answer: number | null): string {
  if (answer === null) return "bg-slate-100 text-slate-400";
  if (answer === 1) return "bg-rose-50 text-rose-700 ring-rose-100";
  if (answer === 2) return "bg-orange-50 text-orange-700 ring-orange-100";
  if (answer === 3) return "bg-slate-100 text-slate-700 ring-slate-200";
  if (answer === 4) return "bg-cyan-50 text-cyan-700 ring-cyan-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

export function ResponseMatrixTable({ data }: { data: ResponseMatrixData }) {
  const t = useTranslations("analytics");

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-sm">
      <CardHeader className="space-y-4 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-cyan-50/60">
        <div>
          <CardTitle className="text-xl">{t("responseMatrix")}</CardTitle>
          <p className="mt-1 text-sm text-slate-600">{t("responseMatrixDesc")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            <UsersRound className="h-3.5 w-3.5 text-cyan-700" />
            {t("matrixRespondents", { count: data.rows.length })}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            <ClipboardList className="h-3.5 w-3.5 text-cyan-700" />
            {t("matrixQuestions", { count: data.questions.length })}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            <Sigma className="h-3.5 w-3.5 text-cyan-700" />
            {t("matrixScale")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.rows.length === 0 || data.questions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            {t("responseMatrixEmpty")}
          </div>
        ) : (
          <>
            <div className="max-h-120 overflow-auto">
              <table className="w-max min-w-full border-separate border-spacing-0 text-center text-xs">
                <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 shadow-[0_1px_0_0_#cbd5e1]">
                  <tr>
                    <th className="sticky left-0 z-40 min-w-28 border-r border-slate-200 bg-slate-100 px-4 py-3 text-left font-semibold">
                      {t("respondent")}
                    </th>
                    {data.questions.map((question) => (
                      <th
                        key={question.itemId}
                        title={question.question}
                        className="min-w-14 border-r border-slate-200 px-3 py-3 font-semibold"
                      >
                        {question.code}
                      </th>
                    ))}
                    <th className="sticky right-24 z-40 min-w-20 border-l border-slate-300 bg-slate-100 px-3 py-3 font-semibold">
                      {t("matrixTotal")}
                    </th>
                    <th className="sticky right-0 z-40 min-w-24 border-l border-slate-300 bg-cyan-50 px-3 py-3 font-semibold text-cyan-900">
                      {t("matrixScore")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.respondent} className="group odd:bg-white even:bg-slate-50/60 hover:bg-cyan-50/40">
                      <th className="sticky left-0 z-20 border-r border-t border-slate-200 bg-inherit px-4 py-2.5 text-left font-semibold text-slate-800 group-hover:bg-cyan-50">
                        {row.respondent}
                      </th>
                      {row.answers.map((answer, index) => (
                        <td key={`${row.respondent}-${data.questions[index]?.itemId ?? index}`} className="border-r border-t border-slate-200 px-2 py-2">
                          <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md font-semibold ring-1 ring-inset", answerTone(answer))}>
                            {answer ?? "—"}
                          </span>
                        </td>
                      ))}
                      <td className="sticky right-24 z-20 border-l border-t border-slate-300 bg-inherit px-3 py-2.5 font-semibold text-slate-800 group-hover:bg-cyan-50">
                        {row.total}
                      </td>
                      <td className="sticky right-0 z-20 border-l border-t border-cyan-200 bg-cyan-50 px-3 py-2.5 font-bold text-cyan-900">
                        {row.scorePercentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="border-t border-slate-200 bg-slate-50/70 px-5 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                {t("questionGuide")}
              </summary>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {data.questions.map((question) => (
                  <div key={question.itemId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                    <span className="mr-2 font-bold text-cyan-800">{question.code}</span>
                    {question.question}
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {t(`dimensions.${question.dimension}`)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
