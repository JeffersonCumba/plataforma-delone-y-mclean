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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("profesorDialogs");
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
        error instanceof Error ? error.message : t("createError"),
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
            {t("newProfesor")}
          </DialogTitle>
          <DialogDescription>
            {t("newProfesorDescription")}
          </DialogDescription>
        </DialogHeader>

        <form className="mt-2 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="ap-username">{t("usernameLabel")}</Label>
            <Input
              id="ap-username"
              value={form.username}
              onChange={handleChange("username")}
              placeholder={t("usernamePlaceholder")}
              disabled={loading}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ap-firstname">{t("firstNameLabel")}</Label>
              <Input
                id="ap-firstname"
                value={form.firstname}
                onChange={handleChange("firstname")}
                placeholder={t("firstNamePlaceholder")}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-lastname">{t("lastNameLabel")}</Label>
              <Input
                id="ap-lastname"
                value={form.lastname}
                onChange={handleChange("lastname")}
                placeholder={t("lastNamePlaceholder")}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ap-email">{t("emailLabel")}</Label>
            <Input
              id="ap-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder={t("emailPlaceholder")}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ap-password">{t("passwordLabel")}</Label>
            <Input
              id="ap-password"
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              placeholder={t("passwordPlaceholder")}
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
              {loading ? t("creatingProfesor") : t("createProfesor")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
