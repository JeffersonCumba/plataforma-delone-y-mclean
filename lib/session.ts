import "server-only";

import { cookies } from "next/headers";

export interface ServerSession {
  userId: number;
  role: "ADMIN" | "EVALUADOR";
  userName: string;
  email: string;
}

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get("user_id")?.value);
  const role = cookieStore.get("user_role")?.value as "ADMIN" | "EVALUADOR" | undefined;
  const userName = cookieStore.get("user_name")?.value ?? "Usuario";
  const email = cookieStore.get("user_email")?.value
    ? decodeURIComponent(cookieStore.get("user_email")!.value)
    : "";

  if (!Number.isInteger(userId) || userId <= 0 || !role) return null;

  return { userId, role, userName, email };
}
