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
        console.error("Error serving logs:", error);
        return NextResponse.json({ error: "Failed to serve logs" }, { status: 500 });
    }
}
