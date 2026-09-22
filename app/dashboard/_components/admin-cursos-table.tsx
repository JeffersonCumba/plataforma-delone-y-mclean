"use client";

import { useLocale, useTranslations } from "next-intl";

import type { AdminCursoRow } from "@/types/admin";

interface AdminCursosTableProps {
  cursos: AdminCursoRow[];
}

export function AdminCursosTable({ cursos }: AdminCursosTableProps) {
  const locale = useLocale();
  const t = useTranslations("adminCursos");

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {t("totalCourses", { count: cursos.length })}
      </p>

      {cursos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
          {t("noCourses")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-250 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">{t("shortName")}</th>
                <th className="px-4 py-3 font-medium">{t("fullName")}</th>
                <th className="px-4 py-3 font-medium">{t("profesores")}</th>
                <th className="px-4 py-3 font-medium">{t("alumnos")}</th>
                <th className="px-4 py-3 font-medium">{t("encuestas")}</th>
                <th className="px-4 py-3 font-medium">{t("created")}</th>
              </tr>
            </thead>
            <tbody>
              {cursos.map((curso) => (
                <tr
                  key={curso.id}
                  className="border-t border-slate-200 bg-white text-slate-800"
                >
                  <td className="px-4 py-3 font-medium">
                    {curso.shortname}
                  </td>
                  <td className="px-4 py-3">{curso.fullname}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {curso.teacherName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {curso.studentCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
                      {curso.surveyCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(curso.timecreated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
