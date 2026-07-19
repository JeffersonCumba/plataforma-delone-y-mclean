import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface ServerSession {
  userId: number;
  role: "ADMIN" | "EVALUADOR";
  userName: string;
}

export async function getServerSession(): Promise<ServerSession> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);
  const role = cookieStore.get("user_role")?.value as "ADMIN" | "EVALUADOR" | undefined;
  const userName = cookieStore.get("user_name")?.value ?? "Usuario";

  if (!Number.isInteger(userId) || userId <= 0 || !role) {
    redirect("/login");
  }

  return { userId, role, userName };
}
