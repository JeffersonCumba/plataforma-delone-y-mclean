"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateCourseForm } from "@/app/dashboard/_components/create-course-form";
import type { AdminCursoRow } from "@/types/admin";

interface AdminCursosTableProps {
  cursos: AdminCursoRow[];
}

export function AdminCursosTable({ cursos }: AdminCursosTableProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Total de cursos en Moodle: {cursos.length}
        </p>
        <Button onClick={() => setShowCreate((prev) => !prev)}>
          <Plus className="mr-2 h-4 w-4" />
          {showCreate ? "Cerrar" : "Crear Curso"}
        </Button>
      </div>

      {showCreate ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <CreateCourseForm
            onSuccess={() => {
              setShowCreate(false);
              router.refresh();
            }}
          />
        </div>
      ) : null}

      {cursos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
          No hay cursos creados en Moodle.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-250 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre corto</th>
                <th className="px-4 py-3 font-medium">Nombre completo</th>
                <th className="px-4 py-3 font-medium">Profesor(es)</th>
                <th className="px-4 py-3 font-medium">Alumnos</th>
                <th className="px-4 py-3 font-medium">Encuestas</th>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                      >
                        <Link href={`/dashboard/cursos/${curso.id}`}>
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Analítica
                        </Link>
                      </Button>
                    </div>
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