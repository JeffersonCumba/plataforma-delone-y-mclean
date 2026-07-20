"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, CheckCircle, Clock, GraduationCap, Mail, User, XCircle, AlertTriangle, Save, Loader2, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrialTimerHorizontal } from "@/app/dashboard/_components/trial-timer";
import { actualizarPerfilAction } from "@/app/dashboard/profesor/perfil/actions";
import type { MoodleCourse } from "@/types/course";

interface ProfileClientProps {
  courses: MoodleCourse[];
  trialDays: number;
  trialInfo: {
    daysRemaining: number;
    isExpired: boolean;
    isWarningPeriod: boolean;
    trialEndsAt: Date | null;
    trialStartDate: Date | null;
  };
  user: {
    username: string;
    firstname: string;
    lastname: string;
    email: string;
  };
}

export function ProfileClient({
  courses,
  trialDays,
  trialInfo,
  user,
}: ProfileClientProps) {
  const { daysRemaining, isExpired, isWarningPeriod, trialEndsAt, trialStartDate } = trialInfo;

  const [profesorData, setProfesorData] = useState({
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    username: user.username,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setProfesorData(prev => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await actualizarPerfilAction(profesorData);
      if (result.ok) {
        localStorage.setItem("user_email", profesorData.email);
        document.cookie = `user_email=${encodeURIComponent(profesorData.email)}; path=/; max-age=86400; samesite=lax`;
        setSaveMessage({ type: "success", text: result.message });
      } else {
        setSaveMessage({ type: "error", text: result.message });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Error al guardar los cambios" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mi Perfil</h1>
        <p className="text-sm text-slate-600">
          Información personal y configuración de cuenta.
        </p>
      </div>

      <div className="flex items-center justify-between mb-2">
        <TrialTimerHorizontal
          daysRemaining={daysRemaining}
          isExpired={isExpired}
          isWarningPeriod={isWarningPeriod}
          trialEndsAt={trialEndsAt}
          trialDays={trialDays}
          showLabel={true}
        />
      </div>

      {isExpired && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-rose-800">Período de prueba expirado</h3>
              <p className="text-sm text-rose-700 mt-1">
                Tu cuenta ha expirado. Contacta al administrador para renovar tu acceso.
              </p>
            </div>
          </div>
        </div>
      )}

      {isWarningPeriod && !isExpired && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 animate-pulse" style={{ animationIterationCount: 1 }}>
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-200/40 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">¡Atención! Tu prueba está por expirar</h3>
              <p className="text-slate-600 mt-1">
                Quedan <strong>{daysRemaining} día(s)</strong> para que finalice tu período de prueba de {trialDays} días.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstname">Nombre</Label>
                  <Input
                    id="firstname"
                    value={profesorData.firstname}
                    onChange={(e) => handleInputChange("firstname", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">Apellido</Label>
                  <Input
                    id="lastname"
                    value={profesorData.lastname}
                    onChange={(e) => handleInputChange("lastname", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    value={profesorData.username}
                    disabled
                    className="bg-slate-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500">El nombre de usuario no se puede cambiar</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profesorData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              {saveMessage && (
                <div className={cn(
                  "rounded-lg p-3 text-sm flex items-center gap-2",
                  saveMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                )}>
                  {saveMessage.type === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {saveMessage.text}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Mis Cursos</CardTitle>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
                  No tienes cursos asignados todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nombre Corto</th>
                        <th className="px-4 py-3 font-medium">Nombre Completo</th>
                        <th className="px-4 py-3 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course: MoodleCourse) => (
                        <tr key={course.id} className="border-t border-slate-200 bg-white text-slate-800">
                          <td className="px-4 py-3 font-medium">{course.shortname}</td>
                          <td className="px-4 py-3">{course.fullname}</td>
                          <td className="px-4 py-3">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                            >
                              <Link href={`/dashboard/cursos/${course.id}`}>
                                <BookOpen className="mr-1 h-3.5 w-3.5" />
                                Ver Analítica
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Estado de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1",
                  isExpired && "bg-rose-50 text-rose-700 ring-rose-200",
                  isWarningPeriod && "bg-amber-50 text-amber-700 ring-amber-200",
                  !isExpired && !isWarningPeriod && "bg-emerald-50 text-emerald-700 ring-emerald-200",
                )}>
                  {isExpired ? (
                    <>
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Expirada
                    </>
                  ) : isWarningPeriod ? (
                    <>
                      <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-slate-600 animate-pulse" style={{ animationIterationCount: 1 }} />
                      Por expirar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Activa
                    </>
                  )}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Días restantes</span>
                  <span className="font-semibold text-slate-900">{daysRemaining} / {trialDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inicio de prueba</span>
                  <span className="font-medium text-slate-900">
                    {trialStartDate ? new Date(trialStartDate).toLocaleDateString("es-AR") : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Expira el</span>
                  <span className="font-medium text-slate-900">
                    {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString("es-AR") : "—"}
                  </span>
                </div>
              </div>

              <TrialTimerHorizontal
                daysRemaining={daysRemaining}
                isExpired={isExpired}
                isWarningPeriod={isWarningPeriod}
                trialEndsAt={trialEndsAt}
                trialDays={trialDays}
                showLabel={true}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-semibold text-slate-900">{courses.length}</p>
                  <p className="text-xs text-slate-500">Cursos asignados</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-semibold text-slate-900">{trialDays}</p>
                  <p className="text-xs text-slate-500">Días de prueba</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/cursos">
                  <BookOpen className="h-4 w-4" />
                  Ver todos mis cursos
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/encuestados">
                  <UsersRound className="h-4 w-4" />
                  Gestionar encuestados
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}