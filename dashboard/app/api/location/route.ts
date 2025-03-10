
// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLocations } from '@/lib/location';

export async function POST(request: NextRequest) {
    const { ipAddresses } = await request.json();

    if (!ipAddresses) {
        return NextResponse.json({ success: false, message: 'No locations provided' }, { status: 400 });
    }

    const locations = await getLocations(ipAddresses);

    const validLocations = locations.filter(loc => loc.country !== null && loc.city !== null);
    console.log(`${validLocations.length} locations found from ${ipAddresses.length} IP addresses`)

    return NextResponse.json({ locations }, { status: 200 });
}

