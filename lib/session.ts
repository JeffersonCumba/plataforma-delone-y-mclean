import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "dlm_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export interface ServerSession {
  userId: number;
  role: "ADMIN" | "EVALUADOR";
  userName: string;
  email: string;
}

interface SessionPayload extends ServerSession {
  expiresAt: number;
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function decodeSession(value: string): ServerSession | null {
  const [encodedPayload, signature, ...extraParts] = value.split(".");
  if (!encodedPayload || !signature || extraParts.length > 0) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    const { userId, role, userName, email, expiresAt } = payload;
    if (
      typeof userId !== "number" ||
      !Number.isInteger(userId) ||
      (role !== "ADMIN" && role !== "EVALUADOR") ||
      typeof userName !== "string" ||
      typeof email !== "string" ||
      typeof expiresAt !== "number" ||
      !Number.isInteger(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return null;
    }
    return { userId, role, userName, email };
  } catch {
    return null;
  }
}

export async function createServerSession(session: ServerSession): Promise<void> {
  const payload: SessionPayload = { ...session, expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${encodedPayload}.${sign(encodedPayload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getServerSession(): Promise<ServerSession | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? decodeSession(value) : null;
}

export { SESSION_COOKIE };
