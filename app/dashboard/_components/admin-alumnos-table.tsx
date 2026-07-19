"use client";

import type { ProfesorRow } from "@/types/admin";

interface AdminAlumnosTableProps {
  alumnos: ProfesorRow[];
}

export function AdminAlumnosTable({ alumnos }: AdminAlumnosTableProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Total de alumnos registrados: {alumnos.length}
      </p>

      {alumnos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
          No hay alumnos registrados en la plataforma.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Cursos</th>
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
