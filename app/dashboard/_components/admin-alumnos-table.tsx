"use client";

import type { ProfesorRow } from "@/types/admin";
import { useTranslations } from "next-intl";

interface AdminAlumnosTableProps {
  alumnos: ProfesorRow[];
}

export function AdminAlumnosTable({ alumnos }: AdminAlumnosTableProps) {
  const t = useTranslations("adminAlumnos");
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {t("totalRegistered", { count: alumnos.length })}
      </p>

      {alumnos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
          {t("noRegistered")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">{t("user")}</th>
                <th className="px-4 py-3 font-medium">{t("name")}</th>
                <th className="px-4 py-3 font-medium">{t("email")}</th>
                <th className="px-4 py-3 font-medium">{t("courses")}</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((alumno) => (
                <tr
                  key={alumno.id}
                  className="border-t border-slate-200 bg-white text-slate-800"
                >
                  <td className="px-4 py-3 font-medium">{alumno.username}</td>
                  <td className="px-4 py-3">{alumno.fullname}</td>
                  <td className="px-4 py-3 text-slate-600">{alumno.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {alumno.courseCount}
                    </span>
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
