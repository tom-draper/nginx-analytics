import { NextRequest, NextResponse } from "next/server";
import { getPassword, usingFileUpload } from "./lib/environment";

export function middleware(request: NextRequest) {
	const password = getPassword();
	const authToken = request.cookies.get("auth_token");

	if (password && !usingFileUpload() && !authToken) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/dashboard",
};