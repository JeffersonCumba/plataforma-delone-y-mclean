"use server";

import { revalidatePath } from "next/cache";

import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";
import { getServerSession } from "@/lib/session";
import { formatSupportCode } from "@/lib/support";
import {
  createSupportTicketSchema,
  supportMessageSchema,
  updateSupportTicketSchema,
} from "@/lib/validations/support";
import {
  addSupportMessage,
  createSupportTicket,
  updateSupportTicket,
} from "@/services/supportService";

export interface SupportActionResult {
  ok: boolean;
  message: string;
  ticketId?: number;
}

export async function createSupportTicketAction(
  payload: unknown,
): Promise<SupportActionResult> {
  const locale = await getServerLocale();
  const session = await getServerSession();
  if (!session || session.role !== "EVALUADOR") {
    return { ok: false, message: translateError(locale, "support.teacherOnly") };
  }

  const parsed = createSupportTicketSchema(locale).safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        translateError(locale, "support.invalidData"),
    };
  }

  try {
    const contextUrl = parsed.data.contextUrl?.startsWith("/")
      ? parsed.data.contextUrl
      : null;
    const ticketId = await createSupportTicket({
      ...parsed.data,
      contextUrl,
      createdBy: session.userId,
    });
    revalidatePath("/dashboard/ayuda");
    revalidatePath("/dashboard/admin/soporte");
    revalidatePath("/dashboard", "layout");
    return {
      ok: true,
      ticketId,
      message: translateError(locale, "support.created", {
        code: formatSupportCode(ticketId),
      }),
    };
  } catch (error) {
    console.error("[createSupportTicketAction]", error);
    return { ok: false, message: translateError(locale, "support.createFailed") };
  }
}

export async function addSupportMessageAction(
  payload: unknown,
): Promise<SupportActionResult> {
  const locale = await getServerLocale();
  const session = await getServerSession();
  if (!session) {
    return { ok: false, message: translateError(locale, "session.invalid") };
  }

  const parsed = supportMessageSchema(locale).safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        translateError(locale, "support.invalidData"),
    };
  }

  try {
    const added = await addSupportMessage({
      ...parsed.data,
      authorId: session.userId,
      authorRole: session.role,
    });
    if (!added) {
      return { ok: false, message: translateError(locale, "support.replyForbidden") };
    }
    revalidatePath(`/dashboard/ayuda/${parsed.data.ticketId}`);
    revalidatePath(`/dashboard/admin/soporte/${parsed.data.ticketId}`);
    revalidatePath("/dashboard/ayuda");
    revalidatePath("/dashboard/admin/soporte");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: translateError(locale, "support.replySent") };
  } catch (error) {
    console.error("[addSupportMessageAction]", error);
    return { ok: false, message: translateError(locale, "support.replyFailed") };
  }
}

export async function updateSupportTicketAction(
  payload: unknown,
): Promise<SupportActionResult> {
  const locale = await getServerLocale();
  const session = await getServerSession();
  if (!session || session.role !== "ADMIN") {
    return { ok: false, message: translateError(locale, "support.adminOnly") };
  }

  const parsed = updateSupportTicketSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: translateError(locale, "support.invalidData") };
  }

  try {
    const updated = await updateSupportTicket({
      ...parsed.data,
      adminId: session.userId,
    });
    if (!updated) {
      return { ok: false, message: translateError(locale, "support.notFound") };
    }
    revalidatePath(`/dashboard/admin/soporte/${parsed.data.ticketId}`);
    revalidatePath(`/dashboard/ayuda/${parsed.data.ticketId}`);
    revalidatePath("/dashboard/admin/soporte");
    revalidatePath("/dashboard/ayuda");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: translateError(locale, "support.updated") };
  } catch (error) {
    console.error("[updateSupportTicketAction]", error);
    return { ok: false, message: translateError(locale, "support.updateFailed") };
  }
}
