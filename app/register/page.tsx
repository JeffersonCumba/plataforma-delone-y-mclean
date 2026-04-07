"use client";

import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUserSchema } from "@/lib/validations/user";
import { registrarUsuario } from "@/services/userService";

interface RegisterFormState {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterFormState>({
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: keyof RegisterFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = registerUserSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Datos de registro invalidos",
      );
      return;
    }

    setLoading(true);

    try {
      await registrarUsuario(parsed.data);

      setForm({
        username: "",
        firstname: "",
        lastname: "",
        email: "",
        password: "",
      });

      toast.success("Usuario regstrado exitosamente", {
        action: {
          label: "Login",
          onClick: () => router.push("/login"),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "Datos de registro invalidos");
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "No fue posible completar el registro";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(2,6,23,0.08),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(15,23,42,0.08),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-size-[72px_72px]" />

      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="max-w-xl text-slate-950">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Registro visual de acceso
          </div>

          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
            Crea tu cuenta para entrar al sistema de evaluacion.
          </h1>
        </div>

        <div className="relative animate-form-enter-right">
          <div className="absolute -inset-6 rounded-[2rem] bg-slate-950/10 blur-3xl" />
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <CardHeader className="px-8 pt-8 sm:px-10 sm:pt-10">
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-500">
                    Registro
                  </p>
                  <CardTitle className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    Nuevo usuario
                  </CardTitle>
                  <CardDescription>
                    Completa los datos básicos para solicitar acceso.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8 sm:px-10 sm:pb-10">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="usuario123"
                    value={form.username}
                    onChange={handleChange("username")}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Nombre"
                      value={form.firstname}
                      onChange={handleChange("firstname")}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Apellido"
                      value={form.lastname}
                      onChange={handleChange("lastname")}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electronico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nombre@dominio.com"
                    value={form.email}
                    onChange={handleChange("email")}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Crear contraseña"
                    value={form.password}
                    onChange={handleChange("password")}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    className="w-full"
                    size="lg"
                    type="submit"
                    disabled={loading}
                  >
                    <UserRoundPlus className="mr-2 h-4 w-4" />
                    {loading ? "Registrando..." : "Crear cuenta"}
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Link href="/login">Ya tengo cuenta</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
