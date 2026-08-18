import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";
import { sendVerificationCode, verifyEmailCode } from "@/services/emailVerificationService";

export async function POST(request: Request): Promise<Response> {
  const locale = await getServerLocale();
  const session = await requireSession();
  if (session instanceof Response) return session;

  let body: { action: string; code?: string };
  try {
    body = (await request.json()) as { action: string; code?: string };
  } catch {
    return NextResponse.json({ message: translateError(locale, "api.invalidBody") }, { status: 400 });
  }

  if (body.action === "send") {
    const result = await sendVerificationCode(session.userId, locale);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (body.action === "verify") {
    if (!body.code || body.code.length !== 6) {
      return NextResponse.json(
        { ok: false, message: translateError(locale, "api.invalidCode") },
        { status: 400 },
      );
    }
    const result = await verifyEmailCode(session.userId, body.code, locale);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ message: translateError(locale, "api.invalidAction") }, { status: 400 });
}
