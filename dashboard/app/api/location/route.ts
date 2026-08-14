import { NextRequest, NextResponse } from 'next/server';
import { getLocations } from '@/lib/location';
import { serverUrl, authToken } from '@/lib/environment';
import { requireDashboardAuth } from '@/lib/auth';
import { isIP } from 'net';

const MAX_LOCATION_IPS = 1_000;

export async function POST(request: NextRequest) {
    const unauthorized = requireDashboardAuth(request);
    if (unauthorized) return unauthorized;
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body)) {
        return NextResponse.json({ success: false, message: 'IP addresses must be an array' }, { status: 400 });
    }
    const ipAddresses = [...new Set(body.filter((ip): ip is string => typeof ip === 'string' && isIP(ip) !== 0))];

    if (ipAddresses.length === 0) {
        return NextResponse.json({ success: false, message: 'No locations provided' }, { status: 400 });
    }
    if (ipAddresses.length > MAX_LOCATION_IPS) {
        return NextResponse.json({ success: false, message: `At most ${MAX_LOCATION_IPS} IP addresses are allowed` }, { status: 413 });
    }

    if (serverUrl) {
        const headers: HeadersInit = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(serverUrl + '/api/location', {
            method: 'POST',
            body: JSON.stringify(ipAddresses),
            headers,
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Error resolving locations by server: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } else {
        const locations = await getLocations(ipAddresses);
        return NextResponse.json(locations, { status: 200 });
    }
}
