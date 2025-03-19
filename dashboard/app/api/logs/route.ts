import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import { authToken, nginxAccessDir, nginxAccessPath, nginxAccessUrl, nginxErrorDir, nginxErrorPath, nginxErrorUrl } from "@/lib/environment";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const gunzip = promisify(zlib.gunzip);

interface FilePosition {
    filename: string;
    position: number;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get("type");

    // Parse positions from the query parameter
    let positions: FilePosition[] = [];
    const positionParam = searchParams.get('positions');

    if (positionParam) {
        try {
            positions = JSON.parse(decodeURIComponent(positionParam));
        } catch (error) {
            console.error("Failed to parse positions:", error);
        }
    }

    // Handle legacy single position parameter
    const singlePosition = parseInt(searchParams.get('position') || '0') || 0;

    const firstRequest = searchParams.get('firstRequest') === 'true';

    if (logType === 'error') {
        if (nginxErrorUrl) {
            const position = positions.length > 0 ? positions[0].position : singlePosition;
            return await serveRemoteLogs(nginxErrorUrl, position, authToken);
        } else if (nginxErrorDir) {
            return await serveDirectoryLogs(nginxErrorDir, positions, true, firstRequest);
        } else {
            // Fallback to single file
            return await serveSingleLog(nginxErrorPath, singlePosition);
        }
    } else {
        if (nginxAccessUrl) {
            const position = positions.length > 0 ? positions[0].position : singlePosition;
            return await serveRemoteLogs(nginxAccessUrl, position, authToken);
        } else if (nginxAccessDir) {
            return await serveDirectoryLogs(nginxAccessDir, positions, false, firstRequest);
        } else {
            // Fallback to single file
            return await serveSingleLog(nginxAccessPath, singlePosition);
        }
    }
}

async function serveSingleLog(filePath: string, position: number) {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
        console.error(`File not found at path ${filePath}`);
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        const fileStats = await stat(resolvedPath);

        // Handle gzipped files
        if (resolvedPath.endsWith('.gz')) {
            const result = await readGzippedLogFile(resolvedPath);
            return NextResponse.json(
                { logs: result.logs, position: 0 },
                { status: 200 }
            );
        }

        // Handle normal log files
        const result = await readNormalLogFile(resolvedPath, position, fileStats.size);
        return NextResponse.json(
            { logs: result.logs, position: result.position },
            { status: 200 }
        );
    } catch (error) {
        console.error(`Error processing file ${resolvedPath}:`, error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function readNormalLogFile(filePath: string, position: number, fileSize: number): Promise<{ logs: string[], position: number }> {
    if (position >= fileSize) {
        return { logs: [], position };
    }

    return new Promise<{ logs: string[], position: number }>((resolve, reject) => {
        try {
            const stream = fs.createReadStream(filePath, {
                start: position,
                encoding: 'utf8'
            });

            let data = '';
            const newLogs: string[] = [];

            stream.on('data', (chunk) => {
                data += chunk;
                const lines = data.split('\n');
                // Save the last potentially incomplete line
                data = lines.pop() || '';
                // Add non-empty lines to logs
                newLogs.push(...lines.filter(line => line.trim() !== ''));
            });

            stream.on('end', () => {
                // Calculate new position accounting for partial last line
                const newPosition = data.length === 0 ? fileSize : fileSize - data.length;
                resolve({
                    logs: newLogs,
                    position: newPosition
                });
            });

            stream.on('error', (error) => {
                console.error(`Error reading log file ${filePath}:`, error);
                reject(new Error(`Error reading log file: ${error.message}`));
            });
        } catch (error) {
            console.error(`Unexpected error in readNormalLogFile:`, error);
            reject(new Error(`Unexpected error in readNormalLogFile: ${error}`));
        }
    });
}

async function serveDirectoryLogs(dirPath: string, positions: FilePosition[], isErrorLog: boolean, includeGzip: boolean) {
    const resolvedPath = path.resolve(process.cwd(), dirPath);
    if (!fs.existsSync(resolvedPath)) {
        console.error(`Directory does not exist: ${resolvedPath}`);
        return NextResponse.json({ error: "Directory not found" }, { status: 404 });
    }
    try {
        // Get all log files in the directory
        const files = await readdir(resolvedPath);
        const logFiles = files.filter(file =>
            (file.endsWith('.log') || (includeGzip && file.endsWith('.gz'))) &&
            (isErrorLog ? file.includes('error') : !file.includes('error'))
        ).sort();

        if (logFiles.length === 0) {
            return NextResponse.json({ message: "No log files found" }, { status: 200 });
        }

        // Initialize positions for .log files only
        const filePositions = logFiles.map(filename => {
            // Only track positions for .log files
            if (filename.endsWith('.log')) {
                const existingPosition = positions.find(p => p.filename === filename);
                return {
                    filename,
                    position: existingPosition ? existingPosition.position : 0
                };
            } else {
                // For .gz files, always use position 0
                return {
                    filename,
                    position: 0
                };
            }
        });

        // Read logs from all files
        const logsResult = await Promise.all(
            filePositions.map(filePos => {
                const isGzFile = filePos.filename.endsWith('.gz');
                // Only process .gz files if includeGzip is true
                if (isGzFile && !includeGzip) {
                    return { logs: [], position: 0 };
                }

                if (isGzFile) {
                    // For .gz files, don't pass position
                    return readLogFile(path.join(resolvedPath, filePos.filename), 0, isGzFile);
                } else {
                    // For .log files, use the tracked position
                    return readLogFile(path.join(resolvedPath, filePos.filename), filePos.position, isGzFile);
                }
            })
        );

        // Combine results
        const allLogs: string[] = [];
        const newPositions: FilePosition[] = [];
        logsResult.forEach((result, index) => {
            if (result.logs.length > 0) {
                allLogs.push(...result.logs);
            }

            // Only include .log files in the positions to track
            if (filePositions[index].filename.endsWith('.log')) {
                newPositions.push({
                    filename: filePositions[index].filename,
                    position: result.position
                });
            }
        });

        console.log(allLogs)
        console.log(newPositions)

        return NextResponse.json(
            { logs: allLogs, positions: newPositions },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error serving directory logs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function readLogFile(filePath: string, position: number, isGzFile: boolean = false): Promise<{ logs: string[], position: number }> {
    try {
        // For gzipped files, we don't care about position tracking
        if (isGzFile || filePath.endsWith('.gz')) {
            return await readGzippedLogFile(filePath);
        }

        const stats = await stat(filePath);
        const fileSize = stats.size;

        if (position >= fileSize) {
            return { logs: [], position };
        }

        return new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath, { start: position, encoding: 'utf8' });
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

async function readGzippedLogFile(filePath: string): Promise<{ logs: string[], position: number }> {
    try {
        // For gzipped files, we read the entire file and decompress it
        const fileBuffer = fs.readFileSync(filePath);
        const decompressed = await gunzip(fileBuffer);
        const content = decompressed.toString('utf8');

        // Split into lines and filter out empties
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

async function serveRemoteLogs(url: string, position: number, authToken?: string) {
    try {
        const response = await fetch(`${url}?position=${position}`, {
            method: "GET",
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });

        if (!response.ok) {
            return new NextResponse(`Error: ${response.statusText}`, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error(error);
        return new NextResponse("Failed to fetch logs", { status: 500 });
    }
}
