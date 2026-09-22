export const SUPPORT_TYPES = ["BUG", "ERROR", "QUESTION", "SUGGESTION"] as const;
export const SUPPORT_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export type SupportType = (typeof SUPPORT_TYPES)[number];
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export interface SupportTicket {
  id: number;
  createdBy: number;
  creatorName: string;
  creatorEmail: string;
  type: SupportType;
  subject: string;
  description: string;
  priority: SupportPriority;
  status: SupportStatus;
  contextUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: number | null;
}

export interface SupportMessage {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: "ADMIN" | "EVALUADOR";
  message: string;
  createdAt: Date;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportMessage[];
}

export interface SupportStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface SupportFilters {
  status?: SupportStatus;
  type?: SupportType;
  priority?: SupportPriority;
}
