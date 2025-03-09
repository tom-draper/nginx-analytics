
// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLocations } from '@/lib/location';

export async function POST(request: NextRequest) {
    const { ipAddresses } = await request.json();

    if (!ipAddresses) {
        return new Response(JSON.stringify({ success: false, message: 'No locations provided' }), { status: 400 });
    }

    const locations = getLocations(ipAddresses);
    return NextResponse.json({ locations }, { status: 200 });
}

