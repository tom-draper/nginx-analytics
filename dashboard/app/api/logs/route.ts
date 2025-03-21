import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import {
    agentUrl,
    authToken,
    nginxAccessDir,
    nginxAccessPath,
    nginxErrorDir,
    nginxErrorPath,
} from "@/lib/environment";
import { defaultNginxAccessDir, defaultNginxErrorDir } from "@/lib/consts";

// Promisified functions
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const gunzip = promisify(zlib.gunzip);

// Type definitions
interface FilePosition {
    filename: string;
    position: number;
}

interface LogResult {
    logs: string[];
    position: number;
    positions?: FilePosition[];
}

/**
 * Handler for GET requests to serve Nginx logs
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get("type");
    const firstRequest = searchParams.get('firstRequest') === 'true';

    // Parse positions from the query parameter
    const positions = parsePositionsFromRequest(searchParams);

    try {
        if (logType === 'error') {
            if (agentUrl) {
                return await serveRemoteLogs(agentUrl, positions, true, firstRequest, authToken);
            } else if (nginxErrorDir) {
                return await serveDirectoryLogs(nginxErrorDir, positions, true, firstRequest);
            } else if (nginxErrorPath) {
                return await serveSingleLog(nginxErrorPath, positions[0].position);
            } else if (nginxAccessDir) {
                return await serveDirectoryLogs(nginxAccessDir, positions, true, firstRequest);
            } else {
                return await serveDirectoryLogs(defaultNginxErrorDir, positions, true, firstRequest);
            }
        } else {
            if (agentUrl) {
                return await serveRemoteLogs(agentUrl, positions, false, firstRequest, authToken);
            } else if (nginxAccessDir) {
                return await serveDirectoryLogs(nginxAccessDir, positions, false, firstRequest);
            } else if (nginxAccessPath) {
                return await serveSingleLog(nginxAccessPath, positions[0].position);
            } else if (nginxErrorDir) {
                return await serveDirectoryLogs(nginxErrorDir, positions, true, firstRequest);
            } else {
                return await serveDirectoryLogs(defaultNginxAccessDir, positions, false, firstRequest);
            }
        }
    } catch (error) {
        console.error("Error serving logs:", error);
        return NextResponse.json({ error: "Failed to serve logs" }, { status: 500 });
    }
}

/**
 * Parse positions parameter from request
 */
function parsePositionsFromRequest(searchParams: URLSearchParams): FilePosition[] {
    const positionParam = searchParams.get('positions');
    if (!positionParam) {
        return [];
    }

    try {
        return JSON.parse(decodeURIComponent(positionParam));
    } catch (error) {
        console.error("Failed to parse positions:", error);
        return [];
    }
}

/**
 * Serve logs from a single file
 */
async function serveSingleLog(filePath: string, position: number): Promise<NextResponse> {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
        console.error(`File not found at path ${filePath}`);
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        const result = await readLogFile(resolvedPath, position);

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error(`Error processing file ${resolvedPath}:`, error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Serve logs from a directory containing multiple log files
 */
async function serveDirectoryLogs(
    dirPath: string,
    positions: FilePosition[],
    isErrorLog: boolean,
    includeGzip: boolean
): Promise<NextResponse> {
    const resolvedPath = path.resolve(process.cwd(), dirPath);

    if (!fs.existsSync(resolvedPath)) {
        console.error(`Directory does not exist: ${resolvedPath}`);
        return NextResponse.json({ error: "Directory not found" }, { status: 404 });
    }

    try {
        // Get filtered log files in the directory
        const files = await readdir(resolvedPath);
        const logFiles = filterLogFiles(files, isErrorLog, includeGzip);

        if (logFiles.length === 0) {
            return NextResponse.json({ message: "No log files found" }, { status: 200 });
        }

        // Initialize positions for each file
        const filePositions = initializeFilePositions(logFiles, positions);

        // Read logs from all files
        const logsResult = await Promise.all(
            filePositions.map(filePos => {
                const isGzFile = filePos.filename.endsWith('.gz');

                // Skip .gz files if includeGzip is false
                if (isGzFile && !includeGzip) {
                    return { logs: [], position: 0 };
                }

                const fullPath = path.join(resolvedPath, filePos.filename);
                return readLogFile(fullPath, filePos.position);
            })
        );

        // Combine results
        const { allLogs, newPositions } = combineLogResults(logsResult, filePositions);

        return NextResponse.json(
            { logs: allLogs, positions: newPositions },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error serving directory logs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Filter log files based on criteria
 */
function filterLogFiles(files: string[], isErrorLog: boolean, includeGzip: boolean): string[] {
    return files.filter(file => {
        // Filter by file extension
        const isValidExtension = file.endsWith('.log') || (includeGzip && file.endsWith('.gz'));

        // Filter by log type
        const isValidLogType = isErrorLog
            ? file.includes('error')
            : !file.includes('error');

        return isValidExtension && isValidLogType;
    }).sort();
}

/**
 * Initialize positions for each log file
 */
function initializeFilePositions(logFiles: string[], positions: FilePosition[]): FilePosition[] {
    return logFiles.map(filename => {
        if (filename.endsWith('.log')) {
            // For .log files, use existing position or start at 0
            const existingPosition = positions.find(p => p.filename === filename);
            return {
                filename,
                position: existingPosition ? existingPosition.position : 0
            };
        } else {
            // For .gz files, always start at position 0
            return { filename, position: 0 };
        }
    });
}

/**
 * Combine log results from multiple files
 */
function combineLogResults(
    logsResult: LogResult[],
    filePositions: FilePosition[]
): { allLogs: string[], newPositions: FilePosition[] } {
    const allLogs: string[] = [];
    const newPositions: FilePosition[] = [];

    logsResult.forEach((result, index) => {
        // Add non-empty log entries
        if (result.logs.length > 0) {
            allLogs.push(...result.logs);
        }

        // Only track positions for .log files
        if (filePositions[index].filename.endsWith('.log')) {
            newPositions.push({
                filename: filePositions[index].filename,
                position: result.position
            });
        }
    });

    return { allLogs, newPositions };
}

/**
 * Read from a log file with special handling for error logs with size 0
 */
async function readLogFile(filePath: string, position: number): Promise<LogResult> {
    try {
        // For gzipped files, use specialized reader
        if (filePath.endsWith('.gz')) {
            return await readGzippedLogFile(filePath);
        }

        // Get file stats
        const stats = await stat(filePath);
        const fileSize = stats.size;
        const isErrorLog = filePath.includes('error');

        // Handle the special case where error logs report size 0 but contain data
        if (isErrorLog && fileSize === 0 && fs.existsSync(filePath)) {
            return await readErrorLogDirectly(filePath, position);
        }

        // If position is at or past file size, no new logs
        if (position >= fileSize) {
            return { logs: [], position };
        }

        // Read file using stream
        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath, {
                start: position,
                encoding: 'utf8'
            });

            let data = '';
            const newLogs: string[] = [];

            stream.on('data', (chunk) => {
                data += chunk;
                const lines = data.split('\n');
                data = lines.pop() || '';
                newLogs.push(...lines.filter(line => line.trim() !== ''));
            });

            stream.on('end', () => {
                const newPosition = data.length === 0 ? fileSize : fileSize - data.length;
                resolve({ logs: newLogs, position: newPosition });
            });

            stream.on('error', (error) => {
                console.error(`Error reading log file ${filePath}:`, error);
                reject(error);
            });
        });
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return { logs: [], position };
    }
}

/**
 * Special handler for error logs that report size 0 but contain data
 */
async function readErrorLogDirectly(filePath: string, position: number): Promise<LogResult> {
    try {
        // Read file directly as utf8 text
        const content = fs.readFileSync(filePath, { encoding: 'utf8' });

        // If position is beyond content length, nothing new to read
        if (position >= content.length) {
            return { logs: [], position };
        }

        // Get new content from position
        const newContent = content.substring(position);

        // Split into lines and filter out empty lines
        const lines = newContent.split('\n').filter(line => line.trim() !== '');

        return {
            logs: lines,
            position: content.length
        };
    } catch (error) {
        console.error(`Error reading error log directly: ${filePath}`, error);
        return { logs: [], position };
    }
}

/**
 * Read from a gzipped log file
 */
async function readGzippedLogFile(filePath: string): Promise<LogResult> {
    try {
        // Read and decompress the entire file
        const fileBuffer = fs.readFileSync(filePath);
        const decompressed = await gunzip(fileBuffer);
        const content = decompressed.toString('utf8');

        // Split into lines and filter out empty lines
        const allLines = content.split('\n').filter(line => line.trim() !== '');

        return {
            logs: allLines,
            position: 0  // Always return 0 as position for gzipped files
        };
    } catch (error) {
        console.error(`Error reading gzipped file ${filePath}:`, error);
        return { logs: [], position: 0 };
    }
}

/**
 * Serve logs from a remote URL
 */
async function serveRemoteLogs(remoteUrl: string, positions: FilePosition[], isErrorLog: boolean, firstRequest: boolean, authToken?: string): Promise<NextResponse> {
    try {
        const headers: HeadersInit = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const url = getUrl(remoteUrl, positions, isErrorLog, firstRequest);
        const response = await fetch(url, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Remote logs error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error("Error fetching remote logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch remote logs" },
            { status: 500 }
        );
    }
}

function getUrl(remoteUrl: string, positions: FilePosition[], isErrorLog: boolean, firstRequest: boolean) {
    let url = `${remoteUrl}/logs/${isErrorLog ? 'error' : 'access'}?type=access&firstRequest=${firstRequest}`;
    if (positions) {
        url += `&positions=${encodeURIComponent(JSON.stringify(positions))}`;
    }
    return url;
}