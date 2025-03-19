import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import { defaultNginxAccessDir, defaultNginxErrorDir, defaultNginxAccessPath, defaultNginxErrorPath } from "@/lib/consts";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const gunzip = promisify(zlib.gunzip);

const nginxAccessDir = process.env.NGINX_ACCESS_DIR || defaultNginxAccessDir;
const nginxErrorDir = process.env.NGINX_ERROR_DIR || process.env.NGINX_ACCESS_DIR || defaultNginxErrorDir;

const nginxAccessPath = process.env.NGINX_ACCESS_PATH || defaultNginxAccessPath;
const nginxErrorPath = process.env.NGINX_ERROR_PATH || defaultNginxErrorPath;

const nginxAccessUrl = process.env.NGINX_ACCESS_URL;
const nginxErrorUrl = process.env.NGINX_ERROR_URL;

const authToken = process.env.NGINX_ANALYTICS_AUTH_TOKEN;

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

    if (logType === 'error') {
        if (nginxErrorUrl) {
            return await serveRemoteLogs(nginxErrorUrl, positions.length > 0 ? positions[0].position : singlePosition, authToken);
        } else if (nginxErrorDir && fs.existsSync(path.resolve(process.cwd(), nginxErrorDir))) {
            return await serveDirectoryLogs(nginxErrorDir, positions, true);
        } else {
            // Fallback to single file
            return await serveSingleLog(nginxErrorPath, singlePosition);
        }
    } else {
        if (nginxAccessUrl) {
            return await serveRemoteLogs(nginxAccessUrl, positions.length > 0 ? positions[0].position : singlePosition, authToken);
        } else if (nginxAccessDir && fs.existsSync(path.resolve(process.cwd(), nginxAccessDir))) {
            return await serveDirectoryLogs(nginxAccessDir, positions, false);
        } else {
            // Fallback to single file
            return await serveSingleLog(nginxAccessPath, singlePosition);
        }
    }
}

async function serveSingleLog(filePath: string, position: number) {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
        console.error(`File not found at path ${filePath}`);
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
        const fileStats = await stat(resolvedPath);

        if (resolvedPath.endsWith('.gz')) {
            const result = await readGzippedLogFile(resolvedPath, position);
            return NextResponse.json(
                { logs: result.logs, position: result.position },
                { status: 200 }
            );
        } else {
            return await new Promise<NextResponse>((resolve, reject) => {
                try {
                    const fileSize = fileStats.size;

                    if (position >= fileSize) {
                        resolve(NextResponse.json({ message: "No new logs", position }, { status: 200 }));
                        return;
                    }

                    const stream = fs.createReadStream(resolvedPath, { start: position, encoding: 'utf8' });
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
                        resolve(NextResponse.json(
                            { logs: newLogs, position: newPosition },
                            { status: 200 }
                        ));
                    });

                    stream.on('error', (error) => {
                        console.error(`Error reading log file ${resolvedPath}:`, error);
                        reject(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
                    });
                } catch (error) {
                    console.error(error);
                    reject(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
                }
            });
        }
    } catch (error) {
        console.error(`Error processing file ${resolvedPath}:`, error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function serveDirectoryLogs(dirPath: string, positions: FilePosition[], isErrorLog: boolean) {
    const resolvedPath = path.resolve(process.cwd(), dirPath);

    try {
        // Get all log files in the directory
        const files = await readdir(resolvedPath);
        const logFiles = files.filter(file =>
            (file.endsWith('.log') || file.endsWith('.gz')) &&
            (isErrorLog ? file.includes('error') : !file.includes('error'))
        ).sort();

        if (logFiles.length === 0) {
            return NextResponse.json({ message: "No log files found" }, { status: 200 });
        }

        // Initialize positions for new files
        const filePositions = logFiles.map(filename => {
            const existingPosition = positions.find(p => p.filename === filename);
            return {
                filename,
                position: existingPosition ? existingPosition.position : 0
            };
        });

        // Read logs from all files
        const logsResult = await Promise.all(
            filePositions.map(filePos => readLogFile(path.join(resolvedPath, filePos.filename), filePos.position))
        );

        // Combine results
        const allLogs: string[] = [];
        const newPositions: FilePosition[] = [];

        logsResult.forEach((result, index) => {
            if (result.logs.length > 0) {
                allLogs.push(...result.logs);
            }
            newPositions.push({
                filename: filePositions[index].filename,
                position: result.position
            });
        });

        return NextResponse.json(
            { logs: allLogs, positions: newPositions },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error serving directory logs:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

async function readLogFile(filePath: string, position: number): Promise<{ logs: string[], position: number }> {
    try {
        const stats = await stat(filePath);
        const fileSize = stats.size;

        if (position >= fileSize) {
            return { logs: [], position };
        }

        // Handle gzipped files differently
        if (filePath.endsWith('.gz')) {
            return await readGzippedLogFile(filePath, position);
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

async function readGzippedLogFile(filePath: string, position: number): Promise<{ logs: string[], position: number }> {
    try {
        // For gzipped files, we currently need to read the entire file and decompress it
        const fileBuffer = fs.readFileSync(filePath);
        const decompressed = await gunzip(fileBuffer);
        const content = decompressed.toString('utf8');

        // Split into lines and filter out empties
        const allLines = content.split('\n').filter(line => line.trim() !== '');

        // Calculate what lines are new based on position
        // Note: position is just a line number for gzipped files since we can't easily seek
        const newLines = allLines.slice(position);

        return {
            logs: newLines,
            position: allLines.length // New position is the total number of lines
        };
    } catch (error) {
        console.error(`Error reading gzipped file ${filePath}:`, error);
        return { logs: [], position };
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

        const data = await response.json(); // or response.json() if JSON response
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error(error);
        return new NextResponse("Failed to fetch logs", { status: 500 });
    }
}