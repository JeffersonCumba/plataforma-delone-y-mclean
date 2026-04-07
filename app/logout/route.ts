import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", _request.url));

  response.cookies.set("user_role", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_name", "", { path: "/", maxAge: 0 });
  response.cookies.set("user_id", "", { path: "/", maxAge: 0 });

  return response;
}
