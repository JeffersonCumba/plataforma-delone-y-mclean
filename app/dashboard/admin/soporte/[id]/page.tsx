import { redirect } from "next/navigation";

import { SupportTicketDetailView } from "@/app/dashboard/_components/support-ticket-detail";
import { requireAuth } from "@/lib/auth";
import { getSupportTicket } from "@/services/supportService";

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  if (session.role !== "ADMIN") redirect("/dashboard/ayuda");

  const ticketId = Number((await params).id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) redirect("/dashboard/admin/soporte");

  const ticket = await getSupportTicket(ticketId, session);
  if (!ticket) redirect("/dashboard/admin/soporte");

  return <SupportTicketDetailView ticket={ticket} viewerRole="ADMIN" />;
}
