
// app/api/auth/route.ts
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	const { password } = await request.json();
	const storedPassword = process.env.NGINX_ANALYTICS_PASSWORD;

	if (password === storedPassword) {
		// Set a cookie to indicate the user is authenticated
		const cookieStore = await cookies();
		cookieStore.set('auth', 'true', {
			path: '/', // Make the cookie available to the entire site
			httpOnly: true, // Protect the cookie from client-side JavaScript access
			maxAge: 60 * 60 * 24 * 7, // Expiry in 7 days (adjust as needed)
		});

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} else {
		return new Response(
			JSON.stringify({ success: false, message: 'Invalid password' }),
			{ status: 401 }
		);
	}
}
