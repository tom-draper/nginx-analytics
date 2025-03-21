import { NextRequest, NextResponse } from 'next/server';
import { getLocations } from '@/lib/location';
import { agentUrl, authToken } from '@/lib/environment';

export async function POST(request: NextRequest) {
    const { ipAddresses } = await request.json();

    if (!ipAddresses) {
        return NextResponse.json({ success: false, message: 'No locations provided' }, { status: 400 });
    }

    if (agentUrl) {
        const headers: HeadersInit = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(agentUrl + '/location', {
            method: 'POST',
            body: JSON.stringify(ipAddresses),
            headers
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Error resolving locations by agent: ${response.statusText}` },
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

