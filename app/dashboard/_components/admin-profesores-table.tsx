"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Trash2, UserRoundPlus } from "lucide-react";
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
import { CrearProfesorDialog } from "@/app/dashboard/_components/crear-profesor-dialog";
import { EditarProfesorDialog } from "@/app/dashboard/_components/editar-profesor-dialog";
import { eliminarProfesorAction } from "@/app/dashboard/admin/actions";
import type { ProfesorRow } from "@/types/admin";

interface AdminProfesoresTableProps {
  profesores: ProfesorRow[];
}

export function AdminProfesoresTable({
  profesores,
}: AdminProfesoresTableProps) {
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
          Total de profesores registrados: {profesores.length}
        </p>
        <CrearProfesorDialog
          trigger={
            <Button>
              <UserRoundPlus className="mr-2 h-4 w-4" />
              Crear Profesor
            </Button>
          }
        />
      </div>

      {profesores.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
          No hay profesores registrados en la plataforma.
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
              {profesores.map((profesor) => (
                <tr
                  key={profesor.id}
                  className="border-t border-slate-200 bg-white text-slate-800"
                >
                  <td className="px-4 py-3 font-medium">
                    {profesor.username}
                  </td>
                  <td className="px-4 py-3">{profesor.fullname}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {profesor.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {profesor.courseCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                      >
                        <Link
                          href={`/dashboard/admin/profesores/${profesor.id}`}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Ver
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-slate-600 hover:bg-slate-100"
                        onClick={() => setEditTarget(profesor)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setDeleteTarget(profesor)}
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
            <DialogTitle>Eliminar profesor</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente a{" "}
              <strong>{deleteTarget?.fullname}</strong> ({deleteTarget?.username}
              ) de Moodle. No se podrá deshacer.
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
              {isDeleting ? "Eliminando..." : "Eliminar profesor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
