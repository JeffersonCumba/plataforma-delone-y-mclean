"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MoodleCourse } from "@/services/courseService";
import { desmatricularUsuarioAction } from "@/app/dashboard/encuestados/actions";

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
  teacherMap?: Map<number, Set<number>>;
}

interface UnenrollTarget {
  userId: number;
  courseId: number;
  fullname: string;
  courseName: string;
}

const ALL_COURSES = "all";

export function EncuestadosTable({ rows, courses, teacherMap }: EncuestadosTableProps) {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<string>(ALL_COURSES);
  const [deleteTarget, setDeleteTarget] = useState<UnenrollTarget | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const filteredRows = useMemo(() => {
    if (selectedCourse === ALL_COURSES) {
      return rows;
    }
    const courseId = Number(selectedCourse);
    return rows.filter((row) => row.courseId === courseId);
  }, [rows, selectedCourse]);

  const handleUnenroll = () => {
    if (!deleteTarget) return;

    startDelete(async () => {
      const result = await desmatricularUsuarioAction(
        deleteTarget.courseId,
        deleteTarget.userId,
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setDeleteTarget(null);
      router.refresh();
    });
  };

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
              <SelectItem value={ALL_COURSES}>Todos los cursos</SelectItem>
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
          <table className="w-full min-w-220 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
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
                  <td className="px-4 py-3">
                    {teacherMap?.get(row.courseId)?.has(row.id) ? (
                      <span className="text-xs text-slate-400 italic">
                        Profesor
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() =>
                          setDeleteTarget({
                            userId: row.id,
                            courseId: row.courseId,
                            fullname: row.fullname,
                            courseName: row.courseName,
                          })
                        }
                      >
                        <LogOut className="mr-1 h-3.5 w-3.5" />
                        Eliminar Matrícula
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar matrícula</DialogTitle>
            <DialogDescription>
              Esta acción desmatriculará a{" "}
              <strong>{deleteTarget?.fullname}</strong> del curso{" "}
              <strong>{deleteTarget?.courseName}</strong>. Podrá volver a
              matricularse más adelante.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnenroll}
              disabled={isDeleting}
            >
              {isDeleting ? "Desmatriculando..." : "Eliminar matrícula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
