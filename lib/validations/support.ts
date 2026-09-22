import { z } from "zod";

import type { Locale } from "@/lib/errors";
import { translateError } from "@/lib/errors";
import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_TYPES,
} from "@/types/support";

export const createSupportTicketSchema = (locale: Locale) =>
  z.object({
    type: z.enum(SUPPORT_TYPES),
    subject: z
      .string()
      .trim()
      .min(5, translateError(locale, "support.subjectTooShort"))
      .max(160, translateError(locale, "support.subjectTooLong")),
    description: z
      .string()
      .trim()
      .min(15, translateError(locale, "support.descriptionTooShort"))
      .max(5000, translateError(locale, "support.descriptionTooLong")),
    priority: z.enum(SUPPORT_PRIORITIES),
    contextUrl: z.string().trim().max(500).optional().nullable(),
  });

export const supportMessageSchema = (locale: Locale) =>
  z.object({
    ticketId: z.number().int().positive(),
    message: z
      .string()
      .trim()
      .min(2, translateError(locale, "support.messageTooShort"))
      .max(3000, translateError(locale, "support.messageTooLong")),
  });

export const updateSupportTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  status: z.enum(SUPPORT_STATUSES),
  priority: z.enum(SUPPORT_PRIORITIES),
});
