"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createCourseAction } from "@/app/dashboard/cursos/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon } from "lucide-react";

function generateDefaultValues(): { fullname: string; shortname: string } {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const sequenceNumber = String(day).padStart(2, "0");

  const fullname = `Encuesta DeLone y McLean_${sequenceNumber}`;
  const shortname = `DLML${day}${month}${year}${hours}${minutes}${seconds}`;

  return { fullname, shortname };
}

interface CreateCourseFormState {
  fullname: string;
  shortname: string;
  summary: string;
}

export function CreateCourseForm({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [generatedDefaults] = useState(() => generateDefaultValues());
  const [form, setForm] = useState<CreateCourseFormState>({
    fullname: generatedDefaults.fullname,
    shortname: generatedDefaults.shortname,
    summary: "",
  });

  const onChange =
    (field: keyof CreateCourseFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await createCourseAction(form);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setForm({ fullname: "", shortname: "", summary: "" });
      toast.success(result.message);
      setOpen(false);
      onSuccess?.();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (newOpen) {
          const defaults = generateDefaultValues();
          setForm((current) => ({
            ...current,
            fullname: defaults.fullname,
            shortname: defaults.shortname,
          }));
        }
        setOpen(newOpen);
      }}>
        <DialogTrigger asChild>
          <Button size="lg">
            crear curso <PlusIcon />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo curso</DialogTitle>
            <DialogDescription>
              Al crear el curso se agrega automaticamente la encuesta DeLone
              &amp; McLean con preguntas fijas.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="course-fullname">Nombre del curso</Label>
              <Input
                id="course-fullname"
                value={form.fullname}
                onChange={onChange("fullname")}
                placeholder="Evaluacion de Software 2026"
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-shortname">Codigo corto</Label>
              <Input
                id="course-shortname"
                value={form.shortname}
                onChange={onChange("shortname")}
                placeholder="DLM-2026"
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-summary">Descripcion (opcional)</Label>
              <Input
                id="course-summary"
                value={form.summary}
                onChange={onChange("summary")}
                placeholder="Curso para evaluacion con modelo DeLone y McLean"
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-2" />
                    Creando curso...
                  </>
                ) : (
                  "Crear curso"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
