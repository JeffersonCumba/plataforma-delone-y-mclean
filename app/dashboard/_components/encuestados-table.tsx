"use client";

import { useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MoodleCourse } from "@/services/courseService";

export interface EncuestadoRow {
  id: number;
  username: string;
  fullname: string;
  email: string;
  courseId: number;
  courseName: string;
}

interface EncuestadosTableProps {
  rows: EncuestadoRow[];
  courses: MoodleCourse[];
}

const ALL_COURSES = "all";

export function EncuestadosTable({ rows, courses }: EncuestadosTableProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>(ALL_COURSES);

  const filteredRows = useMemo(() => {
    if (selectedCourse === ALL_COURSES) {
      return rows;
    }
    const courseId = Number(selectedCourse);
    return rows.filter((row) => row.courseId === courseId);
  }, [rows, selectedCourse]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">
            Filtrar por curso
          </p>
          <p className="text-xs text-slate-500">
            Mostrando {filteredRows.length} de {rows.length} encuestados
            matriculados.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COURSES}>
                Todos los cursos
              </SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.fullname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
          No hay encuestados matriculados en el curso seleccionado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Curso</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={`${row.id}-${row.courseId}`}
                  className="border-t border-slate-200 bg-white text-slate-800"
                >
                  <td className="px-4 py-3">{row.fullname}</td>
                  <td className="px-4 py-3">{row.username}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.courseName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
