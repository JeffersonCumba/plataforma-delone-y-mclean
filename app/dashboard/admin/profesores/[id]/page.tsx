import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pool } from "@/lib/db";
import { obtenerCursosDeProfesor } from "@/services/adminService";
import type { RowDataPacket } from "mysql2";

interface ProfesorInfoRow extends RowDataPacket {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

export default async function AdminProfesorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role !== "ADMIN") {
    redirect("/dashboard/cursos");
  }

  const { id } = await params;
  const teacherId = Number(id);

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    redirect("/dashboard/admin/profesores");
  }

  const [rows] = await pool.execute<ProfesorInfoRow[]>(
    `SELECT id, username, firstname, lastname, email
       FROM mdl_user
      WHERE id = ? AND deleted = 0
      LIMIT 1`,
    [teacherId],
  );

  const profesor = rows[0];
  if (!profesor) {
    redirect("/dashboard/admin/profesores");
  }

  const cursos = await obtenerCursosDeProfesor(teacherId);

  return (
    <section className="space-y-6">
      <Button
        asChild
        variant="ghost"
        className="w-fit px-0 text-slate-600 hover:bg-transparent hover:text-slate-950"
      >
        <Link href="/dashboard/admin/profesores">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Profesores
        </Link>
      </Button>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Perfil del Profesor</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Usuario
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {profesor.username}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Nombre completo
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {profesor.firstname} {profesor.lastname}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Correo
              </dt>
              <dd className="mt-1 text-sm text-slate-600">
                {profesor.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cursos asignados
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {cursos.length}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Cursos del Profesor</CardTitle>
        </CardHeader>
        <CardContent>
          {cursos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
              Este profesor no tiene cursos asignados.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cursos.map((curso) => (
                <Link
                  key={curso.id}
                  href={`/dashboard/cursos/${curso.id}`}
                  className="group block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                >
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-cyan-700">
                    {curso.fullname}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {curso.shortname}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-cyan-700 opacity-0 transition-opacity group-hover:opacity-100">
                    <ExternalLink className="h-3 w-3" />
                    Ver analítica
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
