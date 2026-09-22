import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CircleDot, Clock3, Inbox, LifeBuoy } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import {
  SupportPriorityBadge,
  SupportStatusBadge,
  SupportTypeBadge,
} from "@/app/dashboard/_components/support-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { formatSupportCode } from "@/lib/support";
import { getAdminSupportTickets, getSupportStats } from "@/services/supportService";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_TYPES,
  type SupportFilters,
  type SupportPriority,
  type SupportStatus,
  type SupportType,
} from "@/types/support";

function parseFilter<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] | undefined {
  return value && allowed.includes(value) ? (value as T[number]) : undefined;
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; priority?: string }>;
}) {
  const { role } = await requireAuth();
  if (role !== "ADMIN") redirect("/dashboard/ayuda");

  const params = await searchParams;
  const filters: SupportFilters = {
    status: parseFilter(params.status, SUPPORT_STATUSES) as SupportStatus | undefined,
    type: parseFilter(params.type, SUPPORT_TYPES) as SupportType | undefined,
    priority: parseFilter(params.priority, SUPPORT_PRIORITIES) as SupportPriority | undefined,
  };
  const [tickets, stats, t, locale] = await Promise.all([
    getAdminSupportTickets(filters),
    getSupportStats(),
    getTranslations("support"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const statCards = [
    { label: t("statuses.OPEN"), value: stats.open, icon: CircleDot, color: "text-sky-600" },
    { label: t("statuses.IN_PROGRESS"), value: stats.inProgress, icon: Clock3, color: "text-amber-600" },
    { label: t("statuses.RESOLVED"), value: stats.resolved, icon: CheckCircle2, color: "text-emerald-600" },
    { label: t("statuses.CLOSED"), value: stats.closed, icon: Inbox, color: "text-slate-500" },
  ];

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-slate-500">
          <LifeBuoy className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">{t("eyebrow")}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{t("adminTitle")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("adminDescription")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-slate-200/80 bg-white/95 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent><p className="text-3xl font-semibold text-slate-950">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader><CardTitle className="text-lg">{t("ticketInbox")}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
            <select name="status" defaultValue={filters.status ?? ""} className="h-9 rounded-md border border-input bg-white px-3 text-sm">
              <option value="">{t("allStatuses")}</option>
              {SUPPORT_STATUSES.map((status) => <option key={status} value={status}>{t(`statuses.${status}`)}</option>)}
            </select>
            <select name="type" defaultValue={filters.type ?? ""} className="h-9 rounded-md border border-input bg-white px-3 text-sm">
              <option value="">{t("allTypes")}</option>
              {SUPPORT_TYPES.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </select>
            <select name="priority" defaultValue={filters.priority ?? ""} className="h-9 rounded-md border border-input bg-white px-3 text-sm">
              <option value="">{t("allPriorities")}</option>
              {SUPPORT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{t(`priorities.${priority}`)}</option>)}
            </select>
            <Button type="submit" size="sm">{t("filter")}</Button>
            <Button asChild type="button" size="sm" variant="outline"><Link href="/dashboard/admin/soporte">{t("clearFilters")}</Link></Button>
          </form>

          {tickets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{t("noAdminTickets")}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-225 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("code")}</th>
                    <th className="px-4 py-3 font-medium">{t("requester")}</th>
                    <th className="px-4 py-3 font-medium">{t("subjectLabel")}</th>
                    <th className="px-4 py-3 font-medium">{t("typeLabel")}</th>
                    <th className="px-4 py-3 font-medium">{t("priorityLabel")}</th>
                    <th className="px-4 py-3 font-medium">{t("statusLabel")}</th>
                    <th className="px-4 py-3 font-medium">{t("updatedAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-slate-200 bg-white hover:bg-slate-50">
                      <td className="px-4 py-3"><Link className="font-mono text-xs font-semibold text-sky-700 hover:underline" href={`/dashboard/admin/soporte/${ticket.id}`}>{formatSupportCode(ticket.id)}</Link></td>
                      <td className="px-4 py-3"><p className="font-medium text-slate-800">{ticket.creatorName}</p><p className="text-xs text-slate-500">{ticket.creatorEmail}</p></td>
                      <td className="max-w-xs px-4 py-3"><Link className="font-medium text-slate-900 hover:text-sky-700" href={`/dashboard/admin/soporte/${ticket.id}`}>{ticket.subject}</Link></td>
                      <td className="px-4 py-3"><SupportTypeBadge type={ticket.type} /></td>
                      <td className="px-4 py-3"><SupportPriorityBadge priority={ticket.priority} /></td>
                      <td className="px-4 py-3"><SupportStatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{dateFormatter.format(ticket.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
