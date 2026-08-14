import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isDashboardAuthEnabled, verifySessionToken } from "./lib/auth";
import { password } from "./lib/environment";

export function proxy(request: NextRequest) {
	if (request.nextUrl.pathname === '/api/auth') return NextResponse.next();

	if (isDashboardAuthEnabled() && !verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value, password!)) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/api/:path*"],
};
