import { serverUrl, authToken, systemMonitoringEnabled } from '@/lib/environment';
import { getLogFileSizes, getLogSizeSummary } from '@/lib/file-utils'; // Adjust the import path as needed
import path from 'path';
import fs from 'fs';
import { LogSizes } from '@/lib/types';
import { NextResponse } from 'next/server';

let logPath: string | null = null;

export async function GET() {
    if (serverUrl) {
        const headers: HeadersInit = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(serverUrl + '/api/system/logs', {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Error checking log sizes by server: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } else {
        if (!systemMonitoringEnabled) {
            return NextResponse.json(
                { error: 'System monitoring is disabled' },
                { status: 403 }
            );
        }

        const path = await getLogPath();

        if (!path) {
            return NextResponse.json(
                { message: 'Nginx log path not found' },
                { status: 403 }
            );
        }

        try {
            const files = await getLogFileSizes(path);
            const summary = getLogSizeSummary(files);
            const logSizes: LogSizes = { files, summary }

            return NextResponse.json(logSizes);
        } catch (error) {
            console.error('Error fetching log sizes:', error);
            return NextResponse.json({
                message: 'Failed to get log sizes',
            }, { status: 500 });
        }
    }
}

const getLogPath = async () => {
    if (logPath) {
        return logPath;
    }

    const accessPath = await tryGetLogPath(process.env.NGINX_ANALYTICS_ACCESS_PATH);
    if (accessPath) {
        logPath = accessPath;
        return logPath;
    }

    const errorPath = await tryGetLogPath(process.env.NGINX_ANALYTICS_ERROR_PATH);
    if (errorPath) {
        logPath = errorPath;
        return logPath;
    }

    return null;
}

const tryGetLogPath = async (nginxPath: string | undefined) => {
    if (!nginxPath) {
        return null;
    }

    try {
        const stats = await fs.promises.stat(nginxPath);

        if (stats.isDirectory()) {
            // If it's a directory, use it directly
            return nginxPath;
        } else {
            // If it's a file, get its parent directory
            return path.dirname(nginxPath);
        }
    } catch (error) {
        console.warn(`Could not access Nginx log path: ${error}`);
        return null;
    }
}

