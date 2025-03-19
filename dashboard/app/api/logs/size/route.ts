import { systemMonitoringEnabled } from '@/lib/environment';
import { getLogFileSizes, getLogSizeSummary } from '@/lib/file-utils'; // Adjust the import path as needed
import { LogSizes } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function GET() {
    if (!systemMonitoringEnabled) {
        return NextResponse.json(
            { error: 'System monitoring is disabled' },
            { status: 403 }
        );
    }

    const path = getLogPath();

    try {
        const files = await getLogFileSizes(path);
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

const getLogPath = () => {
    const path = (
        process.env.NGINX_ACCESS_DIR || 
        process.env.NGINX_ERROR_DIR || 
        getParentDir(process.env.NGINX_ACCESS_PATH) || 
        getParentDir(process.env.NGINX_ERROR_PATH) || 
        '/var/logs/nginx'
    );
    return path;
}

const getParentDir = (path: string | undefined) => {
    if (!path) {
        return null;
    }

    return path.substring(0, path.lastIndexOf("/"));
}