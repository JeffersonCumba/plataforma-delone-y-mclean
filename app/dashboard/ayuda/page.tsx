import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, LifeBuoy, MessageSquareText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import {
  SupportPriorityBadge,
  SupportStatusBadge,
  SupportTypeBadge,
} from "@/app/dashboard/_components/support-badges";
import { SupportTicketForm } from "@/app/dashboard/_components/support-ticket-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { formatSupportCode } from "@/lib/support";
import { getTeacherSupportTickets } from "@/services/supportService";

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { userId, role } = await requireAuth();
  if (role !== "EVALUADOR") redirect("/dashboard/admin/soporte");

  const [{ from }, tickets, t, locale] = await Promise.all([
    searchParams,
    getTeacherSupportTickets(userId),
    getTranslations("support"),
    getLocale(),
  ]);
  const contextUrl = from?.startsWith("/") ? from.slice(0, 500) : undefined;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-slate-500">
          <LifeBuoy className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t("eyebrow")}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{t("teacherTitle")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t("teacherDescription")}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="h-5 w-5" />
              {t("newRequest")}
            </CardTitle>
          </CardHeader>
          <CardContent><SupportTicketForm contextUrl={contextUrl} /></CardContent>
        </Card>

        <Card className="h-fit border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader><CardTitle className="text-lg">{t("guidanceTitle")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              <li>{t("guidanceOne")}</li>
              <li>{t("guidanceTwo")}</li>
              <li>{t("guidanceThree")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("myRequests")}</CardTitle>
          <span className="text-sm text-slate-500">{t("ticketCount", { count: tickets.length })}</span>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {t("noTeacherTickets")}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/dashboard/ayuda/${ticket.id}`}
                  className="block bg-white px-4 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-slate-400">{formatSupportCode(ticket.id)}</p>
                      <p className="truncate font-medium text-slate-900">{ticket.subject}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {dateFormatter.format(ticket.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SupportTypeBadge type={ticket.type} />
                      <SupportPriorityBadge priority={ticket.priority} />
                      <SupportStatusBadge status={ticket.status} />
                    </div>
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
