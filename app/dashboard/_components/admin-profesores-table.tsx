"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, UserRoundPlus, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CrearProfesorDialog } from "@/app/dashboard/_components/crear-profesor-dialog";
import { EditarProfesorDialog } from "@/app/dashboard/_components/editar-profesor-dialog";
import {
  simularWarningAction,
  simularExpiracionAction,
} from "@/app/dashboard/admin/actions";
import type { ProfesorRow } from "@/types/admin";
import { TrialTimer } from "@/app/dashboard/_components/trial-timer";

interface AdminProfesoresTableProps {
  profesores: ProfesorRow[];
}

export function AdminProfesoresTable({
  profesores,
}: AdminProfesoresTableProps) {
  const router = useRouter();
  const t = useTranslations("adminProfesores");
  const [editTarget, setEditTarget] = useState<ProfesorRow | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    user: ProfesorRow;
    type: "warning" | "expiration";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSimular(userId: number, type: "warning" | "expiration") {
    setLoading(true);
    setConfirmTarget(null);
    try {
      const action =
        type === "warning" ? simularWarningAction : simularExpiracionAction;
      const result = await action(userId);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(t("simulateError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {t("totalRegistered", { count: profesores.length })}
        </p>
        <CrearProfesorDialog
          trigger={
            <Button>
              <UserRoundPlus className="mr-2 h-4 w-4" />
              {t("createProfesor")}
            </Button>
          }
        />
      </div>

      {profesores.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
          {t("noRegistered")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">{t("user")}</th>
                <th className="px-4 py-3 font-medium">{t("name")}</th>
                <th className="px-4 py-3 font-medium">{t("email")}</th>
                <th className="px-4 py-3 font-medium">{t("courses")}</th>
                <th className="px-4 py-3 font-medium">{t("trial")}</th>
                <th className="px-4 py-3 font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {profesores.map((profesor) => (
                <tr
                  key={profesor.id}
                  className="border-t border-slate-200 bg-white text-slate-800"
                >
                  <td className="px-4 py-3 font-medium">
                    {profesor.username}
                  </td>
                  <td className="px-4 py-3">{profesor.fullname}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {profesor.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {profesor.courseCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <TrialTimer
                      daysRemaining={profesor.trialDaysRemaining}
                      isExpired={profesor.trialIsExpired}
                      isWarningPeriod={profesor.trialIsWarningPeriod}
                      trialEndsAt={profesor.trialEndsAt}
                      trialDays={profesor.trialTotalDays}
                      size="sm"
                      showLabel={false}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                      >
                        <Link
                          href={`/dashboard/admin/profesores/${profesor.id}`}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          {t("view")}
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-slate-600 hover:bg-slate-100"
                        onClick={() => setEditTarget(profesor)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        {t("edit")}
                      </Button>
                      {profesor.username !== "admin" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-amber-600 hover:bg-amber-50"
                            onClick={() =>
                              setConfirmTarget({ user: profesor, type: "warning" })
                            }
                          >
                            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                            {t("warning")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                            onClick={() =>
                              setConfirmTarget({
                                user: profesor,
                                type: "expiration",
                              })
                            }
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            {t("expire")}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget ? (
        <EditarProfesorDialog
          profesor={editTarget}
          open={editTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
              router.refresh();
            }
          }}
        />
      ) : null}

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmTarget?.type === "expiration" ? (
                <Trash2 className="h-5 w-5 text-rose-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              {confirmTarget?.type === "warning"
                ? t("simulateWarning")
                : t("simulateExpiration")}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.type === "warning" ? (
                t.rich("simulateWarningDescription", {
                  name: confirmTarget?.user.fullname ?? "",
                  strong: (chunks) => <strong>{chunks}</strong>,
                })
              ) : (
                t.rich("simulateExpirationDescription", {
                  name: confirmTarget?.user.fullname ?? "",
                  strong: (chunks) => <strong>{chunks}</strong>,
                  em: (chunks) => (
                    <span className="font-semibold text-rose-600">{chunks}</span>
                  ),
                })
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmTarget?.type === "expiration" ? "destructive" : "default"}
              onClick={() =>
                confirmTarget &&
                handleSimular(confirmTarget.user.id, confirmTarget.type)
              }
              disabled={loading}
            >
              {loading
                ? t("simulating")
                : confirmTarget?.type === "warning"
                  ? t("simulateWarning")
                  : t("confirmDeleteExpire")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
