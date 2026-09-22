"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, Mail, MapPin, MessageSquare, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { SupportAdminControls } from "@/app/dashboard/_components/support-admin-controls";
import {
  SupportPriorityBadge,
  SupportStatusBadge,
  SupportTypeBadge,
} from "@/app/dashboard/_components/support-badges";
import { SupportMessageForm } from "@/app/dashboard/_components/support-message-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSupportCode } from "@/lib/support";
import { cn } from "@/lib/utils";
import type { SupportTicketDetail } from "@/types/support";

export function SupportTicketDetailView({
  ticket,
  viewerRole,
}: {
  ticket: SupportTicketDetail;
  viewerRole: "ADMIN" | "EVALUADOR";
}) {
  const t = useTranslations("support");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const backHref = viewerRole === "ADMIN" ? "/dashboard/admin/soporte" : "/dashboard/ayuda";
  const canReply = ticket.status !== "CLOSED";

  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" className="w-fit px-0 text-slate-600 hover:bg-transparent">
        <Link href={backHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToTickets")}
        </Link>
      </Button>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold tracking-wider text-slate-500">
            {formatSupportCode(ticket.id)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">{ticket.subject}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <Clock3 className="h-4 w-4" />
            {t("createdAt", { date: dateFormatter.format(new Date(ticket.createdAt)) })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SupportTypeBadge type={ticket.type} />
          <SupportPriorityBadge priority={ticket.priority} />
          <SupportStatusBadge status={ticket.status} />
        </div>
      </div>

      <div className={cn("grid gap-6", viewerRole === "ADMIN" && "lg:grid-cols-[minmax(0,1fr)_18rem]")}>
        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader><CardTitle className="text-lg">{t("reportDetail")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {viewerRole === "ADMIN" && (
                <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    {ticket.creatorName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {ticket.creatorEmail}
                  </div>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {ticket.description}
              </p>
              {ticket.contextUrl && (
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span><strong>{t("originPage")}:</strong> {ticket.contextUrl}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                {t("conversation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {ticket.messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {t("noMessages")}
                </div>
              ) : (
                <div className="space-y-4">
                  {ticket.messages.map((message) => {
                    const isOwnRole = message.authorRole === viewerRole;
                    return (
                      <div key={message.id} className={cn("flex", isOwnRole ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3",
                          isOwnRole ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-800",
                        )}>
                          <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs opacity-75">
                            <span className="font-semibold">{message.authorName}</span>
                            <span>{dateFormatter.format(new Date(message.createdAt))}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {canReply ? (
                <div className="border-t border-slate-200 pt-5">
                  {viewerRole === "EVALUADOR" && ticket.status === "RESOLVED" && (
                    <p className="mb-3 text-xs text-amber-700">{t("replyReopens")}</p>
                  )}
                  <SupportMessageForm ticketId={ticket.id} />
                </div>
              ) : (
                <div className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
                  {t("closedNoReplies")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {viewerRole === "ADMIN" && (
          <Card className="h-fit border-slate-200/80 bg-white/95 shadow-sm lg:sticky lg:top-20">
            <CardHeader><CardTitle className="text-lg">{t("manageTicket")}</CardTitle></CardHeader>
            <CardContent>
              <SupportAdminControls
                ticketId={ticket.id}
                initialStatus={ticket.status}
                initialPriority={ticket.priority}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
