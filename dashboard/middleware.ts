import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	const password = process.env.NGINX_ANALYTICS_PASSWORD;
	const authToken = request.cookies.get("auth_token");

	const fileUpload = !process.env.NGINX_ACCESS_PATH && !process.env.NGINX_ERROR_PATH && !process.env.NGINX_ACCESS_URL && !process.env.NGINX_ERROR_URL;

	if (password && !fileUpload && !authToken) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/dashboard",
};