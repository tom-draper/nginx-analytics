
// app/api/auth/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { password as storedPassword } from '@/lib/environment';

export async function POST(request: NextRequest) {
	const { password } = await request.json();

	if (password === storedPassword) {
		// Set a cookie to indicate the user is authenticated
		const cookieStore = await cookies();
		cookieStore.set('auth_token', 'true', {
			path: '/', // Make the cookie available to the entire site
			httpOnly: true, // Protect the cookie from client-side JavaScript access
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
