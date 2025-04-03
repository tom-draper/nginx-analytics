import { NextRequest, NextResponse } from "next/server";
import {
    serverUrl,
    authToken,
    nginxAccessPath,
    nginxErrorPath,
} from "@/lib/environment";
import { defaultNginxAccessPath, defaultNginxErrorPath } from "@/lib/consts";
import { isDir, parsePositionsFromRequest, serveDirectoryLogs, serveLog, serveRemoteLogs } from "@/lib/logs";

const isAccessDir = isDir(nginxAccessPath);
const isErrorDir = isDir(nginxErrorPath);

/**
 * Handler for GET requests to serve Nginx logs
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get("type");
    const includeCompressed = searchParams.get('includeCompressed') === 'true';
    const positions = parsePositionsFromRequest(searchParams);

    const isErrorLogs = logType === 'error';
    const nginxPath = isErrorLogs ? nginxErrorPath : nginxAccessPath;
    const isDir = isErrorLogs ? isErrorDir : isAccessDir;
    const nginxAltPath = isErrorLogs ? nginxAccessPath : nginxErrorPath;
    const isAltDir = isErrorLogs ? isAccessDir : isErrorDir;
    const defaultNginxPath = isErrorLogs ? defaultNginxErrorPath : defaultNginxAccessPath;

    try {
        if (serverUrl) {
            return await serveRemoteLogs(serverUrl, positions, isErrorLogs, includeCompressed, authToken);
        } else if (nginxPath) {
            if (isDir) {
                return await serveDirectoryLogs(nginxPath, positions, isErrorLogs, includeCompressed);
            } else {
                const position = positions.length > 0 ? positions[0].position : 0;
                return await serveLog(nginxPath, position);
            }
        } else if (nginxAltPath && isAltDir) {
            // Search alternative directory provided for logs
            return await serveDirectoryLogs(nginxAltPath, positions, isErrorLogs, includeCompressed);
        } else {
            // Try default log path
            return await serveDirectoryLogs(defaultNginxPath, positions, isErrorLogs, includeCompressed);
        }
    } catch (error) {
        console.error("Error serving logs:", error);
        return NextResponse.json({ error: "Failed to serve logs" }, { status: 500 });
    }
}
