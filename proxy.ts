import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const role = request.cookies.get("user_role")?.value;

  if (!Number.isInteger(Number(userId)) || (role !== "ADMIN" && role !== "EVALUADOR")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard(/?.*)",
};
