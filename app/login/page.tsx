"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Ingresa un correo electronico valido");
      return;
    }

    if (!password.trim()) {
      setError("Ingresa una contrasena valida");
      return;
    }

    setLoading(true);

    try {
      const result = await login(normalizedEmail, password);

      localStorage.setItem("user_role", result.role);
      localStorage.setItem("user_name", result.user.fullname);

      document.cookie = `user_role=${result.role}; path=/; max-age=86400; samesite=lax`;
      document.cookie = `user_name=${encodeURIComponent(result.user.fullname)}; path=/; max-age=86400; samesite=lax`;

      if (result.role === "ADMIN") {
        router.push("/dashboard/admin");
        return;
      }

      router.push("/dashboard/evaluador");
    } catch (rawError) {
      const message =
        rawError instanceof Error ? rawError.message : "Error inesperado";

      if (message.includes("No se encontro un usuario")) {
        setError("Usuario no encontrado en el sistema");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4">
      <section className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-balance text-2xl font-semibold text-slate-900">
            Evaluacion de Software
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Inicia sesion con tu correo institucional para continuar.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="email"
              >
                Correo electronico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="nombre@dominio.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-offset-2 transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="password"
              >
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Tu contrasena"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none ring-offset-2 transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300"
                disabled={loading}
                required
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              disabled={loading}
            >
              {loading ? "Validando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
