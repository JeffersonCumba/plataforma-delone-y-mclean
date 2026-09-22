import { redirect } from "next/navigation";

import { SupportTicketDetailView } from "@/app/dashboard/_components/support-ticket-detail";
import { requireAuth } from "@/lib/auth";
import { getSupportTicket } from "@/services/supportService";

export default async function TeacherSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  if (session.role !== "EVALUADOR") redirect("/dashboard/admin/soporte");

  const ticketId = Number((await params).id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) redirect("/dashboard/ayuda");

  const ticket = await getSupportTicket(ticketId, session);
  if (!ticket) redirect("/dashboard/ayuda");

  return <SupportTicketDetailView ticket={ticket} viewerRole="EVALUADOR" />;
}
