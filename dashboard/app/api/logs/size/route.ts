import { getLogFileSizes, getLogSizeSummary } from '@/lib/file-utils'; // Adjust the import path as needed
import { LogSizes } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const path = process.env.NGINX_ACCESS_PATH || '/var/logs/nginx/access.log';

        const logDirectory = path.substring(0, path?.lastIndexOf('/'));

        const files = await getLogFileSizes(logDirectory);
        const summary = getLogSizeSummary(files);
        const logSizes: LogSizes = {files, summary}

        return NextResponse.json(logSizes);
    } catch (error) {
        console.error('Error fetching log sizes:', error);
        return NextResponse.json({
            message: 'Failed to get log sizes',
        }, { status: 500 });
    }
}