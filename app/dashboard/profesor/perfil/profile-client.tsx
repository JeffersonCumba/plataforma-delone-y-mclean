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
import { useLocale, useTranslations } from "next-intl";

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
  const t = useTranslations("perfil");
  const locale = useLocale();
  const { daysRemaining, isExpired, isWarningPeriod, trialEndsAt, trialStartDate } = trialInfo;

  const [profesorData, setProfesorData] = useState({
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    username: user.username,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const hasChanges =
    profesorData.firstname !== user.firstname ||
    profesorData.lastname !== user.lastname ||
    profesorData.email !== user.email;

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
      setSaveMessage({ type: "error", text: t("saveError") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-600">
          {t("description")}
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
              <h3 className="text-lg font-semibold text-rose-800">{t("trialExpired")}</h3>
              <p className="text-sm text-rose-700 mt-1">
                {t("trialExpiredDescription")}
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
              <h3 className="text-lg font-semibold text-slate-800">{t("trialWarning")}</h3>
              <p className="text-slate-600 mt-1">
                {t.rich("trialWarningDays", {
                  days: daysRemaining,
                  trialDays,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("personalInfoTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstname">{t("firstNameLabel")}</Label>
                  <Input
                    id="firstname"
                    value={profesorData.firstname}
                    onChange={(e) => handleInputChange("firstname", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">{t("lastNameLabel")}</Label>
                  <Input
                    id="lastname"
                    value={profesorData.lastname}
                    onChange={(e) => handleInputChange("lastname", e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">{t("usernameLabel")}</Label>
                  <Input
                    id="username"
                    value={profesorData.username}
                    disabled
                    className="bg-slate-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500">{t("usernameFixedHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailLabel")}</Label>
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
                  disabled={isSaving || !hasChanges}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("saveChanges")}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("myCoursesTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
                  {t("noCourses")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t("shortName")}</th>
                        <th className="px-4 py-3 font-medium">{t("fullName")}</th>
                        <th className="px-4 py-3 font-medium">{t("actions")}</th>
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
                                {t("viewAnalytics")}
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
              <CardTitle className="text-lg">{t("accountStatusTitle")}</CardTitle>
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
                      {t("expired")}
                    </>
                  ) : isWarningPeriod ? (
                    <>
                      <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-slate-600 animate-pulse" style={{ animationIterationCount: 1 }} />
                      {t("aboutToExpire")}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t("active")}
                    </>
                  )}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("daysRemaining")}</span>
                  <span className="font-semibold text-slate-900">{daysRemaining} / {trialDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("trialStart")}</span>
                  <span className="font-medium text-slate-900">
                    {trialStartDate ? new Date(trialStartDate).toLocaleDateString(locale) : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("expiresOn")}</span>
                  <span className="font-medium text-slate-900">
                    {trialEndsAt ? new Date(trialEndsAt).toLocaleDateString(locale) : "—"}
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
              <CardTitle className="text-lg">{t("statsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-semibold text-slate-900">{courses.length}</p>
                  <p className="text-xs text-slate-500">{t("assignedCourses")}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-3xl font-semibold text-slate-900">{trialDays}</p>
                  <p className="text-xs text-slate-500">{t("trialDays")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("actionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/cursos">
                  <BookOpen className="h-4 w-4" />
                  {t("viewAllCourses")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/encuestados">
                  <UsersRound className="h-4 w-4" />
                  {t("manageRespondents")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}