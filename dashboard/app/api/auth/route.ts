
// app/api/auth/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { password as storedPassword } from '@/lib/environment';
import { AUTH_COOKIE, createSessionToken, passwordsMatch } from '@/lib/auth';

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => null);
	const password = body?.password;

	if (typeof password === 'string' && typeof storedPassword === 'string' && passwordsMatch(password, storedPassword)) {
		// Set a cookie to indicate the user is authenticated
		const cookieStore = await cookies();
		cookieStore.set(AUTH_COOKIE, createSessionToken(storedPassword), {
			path: '/', // Make the cookie available to the entire site
			httpOnly: true, // Protect the cookie from client-side JavaScript access
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60, 
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} else {
		return NextResponse.json(
			({ success: false, message: 'Unauthorized' }),
			{ status: 401 }
		);
	}
}
