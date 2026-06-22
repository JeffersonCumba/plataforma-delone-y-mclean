"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus } from "lucide-react";
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
import { EditarProfesorDialog } from "@/app/dashboard/_components/editar-profesor-dialog";
import { CrearProfesorDialog } from "@/app/dashboard/_components/crear-profesor-dialog";
import { eliminarProfesorAction } from "@/app/dashboard/admin/actions";
import type { ProfesorRow } from "@/types/admin";

interface AdminAlumnosTableProps {
  alumnos: ProfesorRow[];
}

export function AdminAlumnosTable({ alumnos }: AdminAlumnosTableProps) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<ProfesorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfesorRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const handleDelete = () => {
    if (!deleteTarget) return;

    startDelete(async () => {
      const result = await eliminarProfesorAction(deleteTarget.id);

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Total de alumnos registrados: {alumnos.length}
        </p>
        <CrearProfesorDialog
          trigger={
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Crear Alumno
            </Button>
          }
        />
      </div>

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
                <th className="px-4 py-3 font-medium">Acciones</th>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-slate-600 hover:bg-slate-100"
                        onClick={() => setEditTarget(alumno)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setDeleteTarget(alumno)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget ? (
        <EditarProfesorDialog
          profesor={editTarget}
          title="Editar Alumno"
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
              router.refresh();
            }
          }}
        />
      ) : null}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar alumno</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente a{" "}
              <strong>{deleteTarget?.fullname}</strong> (
              {deleteTarget?.username}) de Moodle. No se podrá deshacer.
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
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar alumno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
