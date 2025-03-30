import { NextRequest, NextResponse } from "next/server";
import {
    serverUrl,
    authToken,
    nginxErrorPath,
    nginxAccessPath,
} from "@/lib/environment";
import { defaultNginxErrorPath } from "@/lib/consts";
import {
    parsePositionsFromRequest,
    serveDirectoryLogs,
    serveLog,
    serveRemoteLogs,
    isErrorDir,
    isAccessDir
} from "@/lib/logs";

/**
 * Handler for GET requests to serve Nginx error logs
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const includeCompressed = searchParams.get('includeCompressed') === 'true';
    const positions = parsePositionsFromRequest(searchParams);

    // These are error logs
    const isErrorLogs = true;
    const nginxPath = nginxErrorPath;
    const isDir = isErrorDir;
    const nginxAltPath = nginxAccessPath;
    const isAltDir = isAccessDir;
    const defaultNginxPath = defaultNginxErrorPath;

    try {
        let result;
        if (serverUrl) {
            result = await serveRemoteLogs(serverUrl, positions, isErrorLogs, includeCompressed, authToken);
        } else if (nginxPath) {
            if (isDir) {
                result = await serveDirectoryLogs(nginxPath, positions, isErrorLogs, includeCompressed);
            } else {
                const position = positions.length > 0 ? positions[0].position : 0;
                result = await serveLog(nginxPath, position);
            }
        } else if (nginxAltPath && isAltDir) {
            // Search alternative directory provided for logs
            result = await serveDirectoryLogs(nginxAltPath, positions, isErrorLogs, includeCompressed);
        } else {
            // Try default log path
            result = await serveDirectoryLogs(defaultNginxPath, positions, isErrorLogs, includeCompressed);
        }

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        } else {
            return NextResponse.json(result.data, { status: result.status });
        }
    } catch (error) {
        console.error("Error serving error logs:", error);
        return NextResponse.json({ error: "Failed to serve logs" }, { status: 500 });
    }
}