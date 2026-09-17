import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET(_request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", _request.url));

  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });

  return response;
}
