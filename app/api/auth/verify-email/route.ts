import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { sendVerificationCode, verifyEmailCode } from "@/services/emailVerificationService";

export async function POST(request: Request): Promise<Response> {
  const session = await requireSession();
  if (session instanceof Response) return session;

  let body: { action: string; code?: string };
  try {
    body = (await request.json()) as { action: string; code?: string };
  } catch {
    return NextResponse.json({ message: "Cuerpo inválido" }, { status: 400 });
  }

  if (body.action === "send") {
    const result = await sendVerificationCode(session.userId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (body.action === "verify") {
    if (!body.code || body.code.length !== 6) {
      return NextResponse.json({ ok: false, message: "Código inválido." }, { status: 400 });
    }
    const result = await verifyEmailCode(session.userId, body.code);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ message: "Acción inválida" }, { status: 400 });
}
