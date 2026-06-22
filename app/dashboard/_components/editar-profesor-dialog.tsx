"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarProfesorAction } from "@/app/dashboard/admin/actions";
import type { ProfesorRow } from "@/types/admin";

interface EditarProfesorDialogProps {
  profesor: ProfesorRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export function EditarProfesorDialog({
  profesor,
  open,
  onOpenChange,
  title = "Editar Profesor",
}: EditarProfesorDialogProps) {
  const [username, setUsername] = useState(profesor.username);
  const [firstname, setFirstname] = useState(profesor.firstname);
  const [lastname, setLastname] = useState(profesor.lastname);
  const [email, setEmail] = useState(profesor.email);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const input: Record<string, string> = {};
      if (username !== profesor.username) input.username = username;
      if (firstname !== profesor.firstname) input.firstname = firstname;
      if (lastname !== profesor.lastname) input.lastname = lastname;
      if (email !== profesor.email) input.email = email;
      if (password) input.password = password;

      if (Object.keys(input).length === 0) {
        toast.info("No hay cambios para guardar.");
        return;
      }

      const result = await actualizarProfesorAction(profesor.id, input);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar profesor",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-cyan-700" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Modifica los datos de {profesor.fullname} en Moodle.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="ep-username">Nombre de usuario</Label>
            <Input
              id="ep-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ep-firstname">Nombre</Label>
              <Input
                id="ep-firstname"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-lastname">Apellido</Label>
              <Input
                id="ep-lastname"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-email">Correo electrónico</Label>
            <Input
              id="ep-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ep-password">
              Contraseña{" "}
              <span className="text-xs text-slate-400">
                (dejar vacío para mantener la actual)
              </span>
            </Label>
            <Input
              id="ep-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
