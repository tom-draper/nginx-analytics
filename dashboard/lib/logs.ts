import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import {
    nginxAccessPath,
    nginxErrorPath,
} from "@/lib/environment";

// Promisified functions
export const readdir = promisify(fs.readdir);
export const stat = promisify(fs.stat);
export const gunzip = promisify(zlib.gunzip);

// Cache for decompressed gz files, keyed by file path
const gzCache = new Map<string, { mtime: number; result: LogResult }>();

export const isAccessDir = isDir(nginxAccessPath);
export const isErrorDir = isDir(nginxErrorPath);

// Type definitions
export interface FilePosition {
    filename?: string;
    position: number;
}

export interface LogResult {
    logs: string[];
    positions: FilePosition[];
    complete?: boolean;
}

/**
 * Parse positions parameter from request
 */
export function parsePositionsFromRequest(searchParams: URLSearchParams): FilePosition[] {
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
export async function serveLog(filePath: string, position: number) {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    try {
        await stat(resolvedPath);
    } catch {
        console.error(`File not found at path ${filePath}`);
        return { error: "File not found", status: 404 };
    }

    try {
        const result = await readLogFile(resolvedPath, position);
        return { data: result, status: 200 };
    } catch (error) {
        console.error(`Error processing file ${resolvedPath}:`, error);
        return { error: "Internal server error", status: 500 };
    }
}

/**
 * Serve logs from a directory containing multiple log files
 */
export async function serveDirectoryLogs(
    dirPath: string,
    positions: FilePosition[],
    isErrorLog: boolean,
    includeGzip: boolean
) {
    const resolvedPath = path.resolve(process.cwd(), dirPath);

    try {
        await stat(resolvedPath);
    } catch {
        console.error(`Directory does not exist: ${resolvedPath}`);
        return { error: "Directory not found", status: 404 };
    }

    try {
        // Get filtered log files in the directory
        const files = await readdir(resolvedPath);
        const logFiles = filterLogFiles(files, isErrorLog, includeGzip);

        if (logFiles.length === 0) {
            return { data: { message: "No log files found" }, status: 200 };
        }

        // Initialize positions for each file
        const filePositions = initializeFilePositions(logFiles, positions);

        // Read logs from all files
        const logsResult = await Promise.all(
            filePositions.map(filePos => {
                if (!filePos.filename) {
                    return { logs: [], positions: [] };
                }

                const isGzFile = filePos.filename.endsWith('.gz');

                // Skip .gz files if includeGzip is false
                if (isGzFile && !includeGzip) {
                    return { logs: [], positions: [] };
                }

                const fullPath = path.join(resolvedPath, filePos.filename);
                return readLogFile(fullPath, filePos.position);
            })
        );

        // Combine results
        const { allLogs, newPositions } = combineLogResults(logsResult, filePositions);

        return {
            data: { logs: allLogs, positions: newPositions },
            status: 200
        };
    } catch (error) {
        console.error("Error serving directory logs:", error);
        return { error: "Internal server error", status: 500 };
    }
}

/**
 * Filter log files based on criteria
 */
export function filterLogFiles(files: string[], isErrorLog: boolean, includeGzip: boolean): string[] {
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
export function initializeFilePositions(logFiles: string[], positions: FilePosition[]): FilePosition[] {
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
export function combineLogResults(
    logsResult: LogResult[],
    filePositions: FilePosition[]
): { allLogs: string[], newPositions: FilePosition[] } {
    const allLogs: string[] = [];
    const newPositions: FilePosition[] = [];

    logsResult.forEach((result, index) => {
        if (!filePositions[index].filename) {
            return;
        }

        // Add non-empty log entries
        if (result.logs.length > 0) {
            allLogs.push(...result.logs);
        }

        // Only track positions for .log files
        if (filePositions[index].filename?.endsWith('.log')) {
            newPositions.push({
                filename: filePositions[index].filename,
                position: result.positions[0]?.position ?? filePositions[index].position
            });
        }
    });

    return { allLogs, newPositions };
}

/**
 * Read from a log file with special handling for error logs with size 0
 */
export async function readLogFile(filePath: string, position: number): Promise<LogResult> {
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
        if (isErrorLog && fileSize === 0) {
            return await readErrorLogDirectly(filePath, position);
        }

        // If position is at or past file size, no new logs
        if (position >= fileSize) {
            return { logs: [], positions: [{ position }] };
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
                resolve({ logs: newLogs, positions: [{ position: newPosition }] });
            });

            stream.on('error', (error) => {
                console.error(`Error reading log file ${filePath}:`, error);
                reject(error);
            });
        });
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return { logs: [], positions: [{ position }] };
    }
}

/**
 * Special handler for error logs that report size 0 but contain data
 */
export async function readErrorLogDirectly(filePath: string, position: number): Promise<LogResult> {
    try {
        // Read file directly as utf8 text
        const content = await fs.promises.readFile(filePath, { encoding: 'utf8' });

        // If position is beyond content length, nothing new to read
        if (position >= content.length) {
            return { logs: [], positions: [{ position }] };
        }

        // Get new content from position
        const newContent = content.substring(position);

        // Split into lines and filter out empty lines
        const lines = newContent.split('\n').filter(line => line.trim() !== '');

        return {
            logs: lines,
            positions: [{ position: content.length }]
        };
    } catch (error) {
        console.error(`Error reading error log directly: ${filePath}`, error);
        return { logs: [], positions: [{ position }] };
    }
}

/**
 * Read from a gzipped log file
 */
export async function readGzippedLogFile(filePath: string): Promise<LogResult> {
    try {
        const fileStats = await stat(filePath);
        const mtime = fileStats.mtimeMs;

        const cached = gzCache.get(filePath);
        if (cached && cached.mtime === mtime) {
            return cached.result;
        }

        // Read and decompress the entire file
        const fileBuffer = await fs.promises.readFile(filePath);
        const decompressed = await gunzip(fileBuffer);
        const content = decompressed.toString('utf8');

        // Split into lines and filter out empty lines
        const allLines = content.split('\n').filter(line => line.trim() !== '');

        const result: LogResult = {
            logs: allLines,
            positions: [{ position: 0 }]
        };

        gzCache.set(filePath, { mtime, result });
        return result;
    } catch (error) {
        console.error(`Error reading gzipped file ${filePath}:`, error);
        return { logs: [], positions: [{ position: 0 }] };
    }
}

/**
 * Serve logs from a remote URL
 */
export async function serveRemoteLogs(remoteUrl: string, positions: FilePosition[], isErrorLog: boolean, includeCompressed: boolean, authToken?: string) {
    try {
        const headers: HeadersInit = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const url = getUrl(remoteUrl, positions, isErrorLog, includeCompressed);
        const response = await fetch(url, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return {
                error: `Remote logs error: ${response.statusText}`,
                status: response.status
            };
        }

        // Clone the response before consuming it
        const responseClone = response.clone();

        // Try to parse as JSON first
        try {
            const data = await response.json();
            return { data, status: 200 };
        } catch {
            try {
                // Check if serving raw logs as text
                const textData = await responseClone.text();

                const processedData = {
                    logs: parseNginxLogToJson(textData),
                    positions: positions, // Maintain original positions since we can't get new ones
                    complete: true // One-time request, avoid fetching for live updates
                };
                
                return { data: processedData, status: 200 }
            } catch (error) {
                console.error("Error fetching remote logs:", error);
                return {
                    error: "Failed to fetch remote logs",
                    status: 500
                }
            }
        }
    } catch (error) {
        console.error("Error fetching remote logs:", error);
        return {
            error: "Failed to fetch remote logs",
            status: 500
        };
    }
}

/**
 * Parse Nginx log text into structured JSON format
 * Supports common log format, combined log format, and error logs
 */
function parseNginxLogToJson(logText: string) {
    // Split by lines and filter out empty lines
    return logText.trim().split('\n').filter(line => line.trim() !== '');
}


function getUrl(remoteUrl: string, positions: FilePosition[], isErrorLog: boolean, includeCompressed: boolean) {
    const logType = isErrorLog ? 'error' : 'access'
    let url = `${remoteUrl}/api/logs/${logType}?includeCompressed=${includeCompressed}`;
    if (positions.length > 0) {
        url += `&positions=${encodeURIComponent(JSON.stringify(positions))}`;
    }
    return url;
}

export function isDir(path: string | undefined) {
    if (!path) {
        return false;
    }

    try {
        return fs.lstatSync(path).isDirectory();
    } catch {
        return false;
    }
}