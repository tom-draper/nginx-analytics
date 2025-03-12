import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const password = process.env.NGINX_ANALYTICS_PASSWORD;
  const authToken = request.cookies.get("auth_token");

  if (password && !authToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard",
};