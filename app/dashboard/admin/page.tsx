import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const userNameCookie = cookieStore.get("user_name")?.value;

  if (!role) {
    redirect("/login");
  }

  if (role !== "ADMIN") {
    redirect("/dashboard/evaluador");
  }

  const userName = userNameCookie
    ? decodeURIComponent(userNameCookie)
    : "Usuario";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Panel de administrador
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Hola, {userName}
        </h1>
        <p className="mt-3 text-slate-700">
          Esta es una pagina simple de destino para el rol ADMIN.
        </p>
      </section>
    </main>
  );
}
