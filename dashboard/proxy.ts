import { NextRequest, NextResponse } from "next/server";
import { password, usingFileUpload } from "./lib/environment";

export function proxy(request: NextRequest) {
	const authToken = request.cookies.get("auth_token");

	if (password && !usingFileUpload && !authToken) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/dashboard",
};