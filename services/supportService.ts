import "server-only";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import type {
  SupportFilters,
  SupportMessage,
  SupportPriority,
  SupportStats,
  SupportStatus,
  SupportTicket,
  SupportTicketDetail,
  SupportType,
} from "@/types/support";

interface TicketRow extends RowDataPacket {
  id: number;
  created_by: number;
  creator_name: string;
  creator_email: string;
  type: SupportType;
  subject: string;
  description: string;
  priority: SupportPriority;
  status: SupportStatus;
  context_url: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  resolved_by: number | null;
}

interface MessageRow extends RowDataPacket {
  id: number;
  ticket_id: number;
  author_id: number;
  author_name: string;
  author_role: "ADMIN" | "EVALUADOR";
  message: string;
  created_at: Date;
}

interface StatsRow extends RowDataPacket {
  status: SupportStatus;
  total: number;
}

const TICKET_SELECT = `
  SELECT t.id, t.created_by, t.type, t.subject, t.description,
         t.priority, t.status, t.context_url, t.created_at, t.updated_at,
         t.resolved_at, t.resolved_by,
         TRIM(CONCAT(u.firstname, ' ', u.lastname)) AS creator_name,
         u.email AS creator_email
    FROM mdl_support_ticket t
    JOIN mdl_user u ON u.id = t.created_by`;

function mapTicket(row: TicketRow): SupportTicket {
  return {
    id: row.id,
    createdBy: row.created_by,
    creatorName: row.creator_name,
    creatorEmail: row.creator_email,
    type: row.type,
    subject: row.subject,
    description: row.description,
    priority: row.priority,
    status: row.status,
    contextUrl: row.context_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    resolvedBy: row.resolved_by,
  };
}

function mapMessage(row: MessageRow): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    message: row.message,
    createdAt: new Date(row.created_at),
  };
}

export async function createSupportTicket(input: {
  createdBy: number;
  type: SupportType;
  subject: string;
  description: string;
  priority: SupportPriority;
  contextUrl?: string | null;
}): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO mdl_support_ticket
       (created_by, type, subject, description, priority, status, context_url)
     VALUES (?, ?, ?, ?, ?, 'OPEN', ?)`,
    [
      input.createdBy,
      input.type,
      input.subject,
      input.description,
      input.priority,
      input.contextUrl || null,
    ],
  );

  return result.insertId;
}

export async function getTeacherSupportTickets(
  userId: number,
): Promise<SupportTicket[]> {
  const [rows] = await pool.execute<TicketRow[]>(
    `${TICKET_SELECT}
      WHERE t.created_by = ?
      ORDER BY t.updated_at DESC
      LIMIT 200`,
    [userId],
  );

  return rows.map(mapTicket);
}

export async function getAdminSupportTickets(
  filters: SupportFilters = {},
): Promise<SupportTicket[]> {
  const clauses: string[] = [];
  const values: string[] = [];

  if (filters.status) {
    clauses.push("t.status = ?");
    values.push(filters.status);
  }
  if (filters.type) {
    clauses.push("t.type = ?");
    values.push(filters.type);
  }
  if (filters.priority) {
    clauses.push("t.priority = ?");
    values.push(filters.priority);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await pool.execute<TicketRow[]>(
    `${TICKET_SELECT}
      ${where}
      ORDER BY FIELD(t.status, 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'),
               FIELD(t.priority, 'HIGH', 'MEDIUM', 'LOW'),
               t.updated_at DESC
      LIMIT 300`,
    values,
  );

  return rows.map(mapTicket);
}

export async function getSupportTicket(
  ticketId: number,
  viewer: { userId: number; role: "ADMIN" | "EVALUADOR" },
): Promise<SupportTicketDetail | null> {
  const ownership = viewer.role === "ADMIN" ? "" : "AND t.created_by = ?";
  const params = viewer.role === "ADMIN" ? [ticketId] : [ticketId, viewer.userId];
  const [ticketRows] = await pool.execute<TicketRow[]>(
    `${TICKET_SELECT}
      WHERE t.id = ? ${ownership}
      LIMIT 1`,
    params,
  );

  if (!ticketRows[0]) return null;

  const [messageRows] = await pool.execute<MessageRow[]>(
    `SELECT m.id, m.ticket_id, m.author_id, m.author_role, m.message, m.created_at,
            TRIM(CONCAT(u.firstname, ' ', u.lastname)) AS author_name
       FROM mdl_support_message m
       JOIN mdl_user u ON u.id = m.author_id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC, m.id ASC`,
    [ticketId],
  );

  return { ...mapTicket(ticketRows[0]), messages: messageRows.map(mapMessage) };
}

export async function addSupportMessage(input: {
  ticketId: number;
  authorId: number;
  authorRole: "ADMIN" | "EVALUADOR";
  message: string;
}): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const ownership = input.authorRole === "ADMIN" ? "" : "AND created_by = ?";
    const params =
      input.authorRole === "ADMIN"
        ? [input.ticketId]
        : [input.ticketId, input.authorId];
    const [tickets] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status FROM mdl_support_ticket
        WHERE id = ? ${ownership}
        FOR UPDATE`,
      params,
    );
    const ticket = tickets[0] as { id: number; status: SupportStatus } | undefined;
    if (!ticket || ticket.status === "CLOSED") {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `INSERT INTO mdl_support_message (ticket_id, author_id, author_role, message)
       VALUES (?, ?, ?, ?)`,
      [input.ticketId, input.authorId, input.authorRole, input.message],
    );

    const nextStatus =
      input.authorRole === "ADMIN" && ticket.status === "OPEN"
        ? "IN_PROGRESS"
        : input.authorRole === "EVALUADOR" && ticket.status === "RESOLVED"
          ? "OPEN"
          : ticket.status;
    await connection.execute(
      `UPDATE mdl_support_ticket
          SET status = ?, updated_at = NOW(),
              resolved_at = IF(? = 'RESOLVED', resolved_at, NULL),
              resolved_by = IF(? = 'RESOLVED', resolved_by, NULL)
        WHERE id = ?`,
      [nextStatus, nextStatus, nextStatus, input.ticketId],
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSupportTicket(input: {
  ticketId: number;
  status: SupportStatus;
  priority: SupportPriority;
  adminId: number;
}): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE mdl_support_ticket
        SET status = ?, priority = ?, updated_at = NOW(),
            resolved_at = CASE WHEN ? IN ('RESOLVED', 'CLOSED') THEN COALESCE(resolved_at, NOW()) ELSE NULL END,
            resolved_by = CASE WHEN ? IN ('RESOLVED', 'CLOSED') THEN ? ELSE NULL END
      WHERE id = ?`,
    [
      input.status,
      input.priority,
      input.status,
      input.status,
      input.adminId,
      input.ticketId,
    ],
  );

  return result.affectedRows > 0;
}

export async function getSupportStats(): Promise<SupportStats> {
  const [rows] = await pool.execute<StatsRow[]>(
    `SELECT status, COUNT(*) AS total
       FROM mdl_support_ticket
      GROUP BY status`,
  );
  const stats: SupportStats = { open: 0, inProgress: 0, resolved: 0, closed: 0 };
  for (const row of rows) {
    const total = Number(row.total);
    if (row.status === "OPEN") stats.open = total;
    if (row.status === "IN_PROGRESS") stats.inProgress = total;
    if (row.status === "RESOLVED") stats.resolved = total;
    if (row.status === "CLOSED") stats.closed = total;
  }
  return stats;
}

export async function getOpenSupportTicketCount(): Promise<number> {
  try {
    const [rows] = await pool.execute<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total
         FROM mdl_support_ticket
        WHERE status IN ('OPEN', 'IN_PROGRESS')`,
    );
    return Number(rows[0]?.total ?? 0);
  } catch (error) {
    if ((error as { code?: string }).code === "ER_NO_SUCH_TABLE") return 0;
    throw error;
  }
}
