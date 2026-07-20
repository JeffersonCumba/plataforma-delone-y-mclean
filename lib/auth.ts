import "server-only";

import { redirect } from "next/navigation";
import { getServerSession, type ServerSession } from "./session";

export function unauthorized(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function badRequest(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export function forbidden(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export function serverError(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

export async function requireAuth(): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireSession(): Promise<ServerSession | Response> {
  const session = await getServerSession();
  if (!session) return unauthorized("Sesión inválida");
  return session;
}
