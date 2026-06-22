"use client";

import { useState } from "react";
import { UserRoundPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearProfesorAction } from "@/app/dashboard/admin/actions";

interface CrearProfesorDialogProps {
  trigger?: React.ReactNode;
}

interface FormState {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

const EMPTY_FORM: FormState = {
  username: "",
  firstname: "",
  lastname: "",
  email: "",
  password: "",
};

export function CrearProfesorDialog({ trigger }: CrearProfesorDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await crearProfesorAction(form);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al crear profesor",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-cyan-700" />
            Nuevo Profesor
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario con perfil de profesor en Moodle.
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="ap-username">Nombre de usuario</Label>
            <Input
              id="ap-username"
              value={form.username}
              onChange={handleChange("username")}
              placeholder="usuario123"
              disabled={loading}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ap-firstname">Nombre</Label>
              <Input
                id="ap-firstname"
                value={form.firstname}
                onChange={handleChange("firstname")}
                placeholder="Nombre"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-lastname">Apellido</Label>
              <Input
                id="ap-lastname"
                value={form.lastname}
                onChange={handleChange("lastname")}
                placeholder="Apellido"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ap-email">Correo electrónico</Label>
            <Input
              id="ap-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="nombre@dominio.com"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ap-password">Contraseña</Label>
            <Input
              id="ap-password"
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserRoundPlus className="mr-2 h-4 w-4" />
              )}
              {loading ? "Creando..." : "Crear Profesor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
