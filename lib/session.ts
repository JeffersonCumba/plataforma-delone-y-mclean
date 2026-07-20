import "server-only";

import { cookies } from "next/headers";

export interface ServerSession {
  userId: number;
  role: "ADMIN" | "EVALUADOR";
  userName: string;
}

export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get("user_id")?.value);
  const role = cookieStore.get("user_role")?.value as "ADMIN" | "EVALUADOR" | undefined;
  const userName = cookieStore.get("user_name")?.value ?? "Usuario";

  if (!Number.isInteger(userId) || userId <= 0 || !role) return null;

  return { userId, role, userName };
}
