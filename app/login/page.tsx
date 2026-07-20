"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import { AnimatedHeading } from "@/components/animated-heading";
import { login } from "@/services/authService";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Ingresa un correo electrónico válido")
    .email("Ingresa un correo electrónico válido"),
  password: z.string().min(1, "Ingresa una contraseña válida"),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

const surveyBaseUrl = process.env.NEXT_PUBLIC_MOODLE_BASE_URL?.trim() ?? "";
const passwordUrl = `${surveyBaseUrl}/login/forgot_password.php`;

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const router = useRouter();
  const { email: emailParam } = use(searchParams);

  const [email, setEmail] = useState(emailParam ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)user_id=(\d+)/);
    if (match && Number.isInteger(Number(match[1])) && Number(match[1]) > 0) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path[0] as keyof FieldErrors;
      setErrors({ [field]: issue.message });
      toast.error(issue.message);
      return;
    }

    setLoading(true);

    try {
      const result = await login(parsed.data.email, parsed.data.password);

      localStorage.setItem("user_role", result.role);
      localStorage.setItem("user_name", result.user.fullname);
      localStorage.setItem("user_id", String(result.user.id));
      localStorage.setItem("user_email", result.user.email);

      document.cookie = `user_role=${result.role}; path=/; max-age=86400; samesite=lax`;
      document.cookie = `user_name=${encodeURIComponent(result.user.fullname)}; path=/; max-age=86400; samesite=lax`;
      document.cookie = `user_id=${result.user.id}; path=/; max-age=86400; samesite=lax`;
      document.cookie = `user_email=${encodeURIComponent(result.user.email)}; path=/; max-age=86400; samesite=lax`;

      router.push("/dashboard");
    } catch (rawError) {
      const message =
        rawError instanceof Error
          ? rawError.message
          : "Error al iniciar sesión. Intentalo de nuevo más tarde.";

      const field = message.toLowerCase().includes("correo")
        ? "email"
        : message.toLowerCase().includes("contraseña")
          ? "password"
          : null;

      toast.error(message);

      if (field) {
        setErrors({ [field]: message });
      } else {
        setErrors({ email: message, password: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(2,6,23,0.08),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(15,23,42,0.08),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 text-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-size-[72px_72px]" />
      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-2xl text-slate-950">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-slate-900" />
            Acceso seguro a la plataforma de evaluación
          </div>

          <AnimatedHeading className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[55px]">
            Inicia sesión para continuar con tu evaluación o revisar los datos
            del estudio.
          </AnimatedHeading>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
            Usa tus credenciales para entrar al entorno de encuestas,
            dashboards y análisis del modelo DeLone y McLean.
          </p>
        </div>

        <div className="relative animate-form-enter-right">
          <div className="absolute -inset-6 rounded-[2rem] bg-slate-950/10 blur-3xl" />
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_5px_15px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <CardHeader className="mb-2 px-8 pt-8 sm:px-10 sm:pt-10">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-500">
                    Login
                  </p>
                  <CardTitle className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    Bienvenido de nuevo
                  </CardTitle>
                  <CardDescription>
                    Ingresa con tus credenciales para continuar.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8 sm:px-10 sm:pb-10">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }
                    }}
                    autoComplete="email"
                    placeholder="nombre@dominio.com"
                    disabled={loading}
                    required
                    aria-invalid={!!errors.email}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.password;
                          return next;
                        });
                      }
                    }}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    disabled={loading}
                    required
                    aria-invalid={!!errors.password}
                    autoFocus={!!emailParam}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                </div>

                {surveyBaseUrl ? (
                  <div className="flex justify-end">
                    <a
                      href={passwordUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-blue-500 transition-colors hover:text-blue-600 hover:underline"
                    >
                      Olvidé mi contraseña
                    </a>
                  </div>
                ) : null}

                <Button asChild className="w-full mb-3" size="lg">
                  <button type="submit" disabled={loading}>
                    {loading ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
                    )}
                    {loading ? "Ingresando..." : "Ingresar"}
                  </button>
                </Button>

                <div className="flex flex-col gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <Link href="/register">Crear cuenta</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full" size="lg">
                    <Link href="/">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver al inicio
                    </Link>
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
