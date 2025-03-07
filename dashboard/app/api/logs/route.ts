import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { defaultNginxAccessPath, defaultNginxErrorPath } from "@/lib/consts";

const nginxAccessPath = process.env.NGINX_ACCESS_PATH || defaultNginxAccessPath;
const nginxErrorPath = process.env.NGINX_ERROR_PATH || defaultNginxErrorPath;

const nginxAccessUrl = process.env.NGINX_ACCESS_URL;
const nginxErrorUrl = process.env.NGINX_ERROR_URL;
const authToken = process.env.AUTH_TOKEN;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get("type");

    if (!logType) {
        console.error('Log type required.');
        return NextResponse.json({ error: "Log type required." }, { status: 400 });
    }

    const position = parseInt(searchParams.get('position') || '') || 0;

    if (logType === 'error') {
        if (nginxErrorUrl) {
            return await serveRemoteLogs(nginxErrorUrl, position, authToken);
        } else {
            return await serveLocalLogs(nginxErrorPath, position);
        }
    } else {
        if (nginxAccessUrl) {
            return await serveRemoteLogs(nginxAccessUrl, position, authToken);
        } else {
            return await serveLocalLogs(nginxAccessPath, position);
        }
    }
}

async function serveLocalLogs(filePath: string, position: number) {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
        console.error(`File not found at path ${filePath}.`);
        return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    return new Promise<NextResponse>((resolve, reject) => {
        try {
            fs.stat(resolvedPath, (err, stats) => {
                if (err) {
                    reject(NextResponse.json({ error: "Internal server error." }, { status: 500 }));
                    return;
                }

                const fileSize = stats.size;

                if (position >= fileSize) {
                    console.error('No new logs.');
                    resolve(NextResponse.json({ message: "No new logs." }, { status: 200 }));
                    return;
                }

                // Use a read stream to read the log file from the current position
                const stream = fs.createReadStream(resolvedPath, { start: position, encoding: 'utf8' });
                let data = '';
                const newLogs: string[] = [];

                // Read in chunks and process logs line by line
                stream.on('data', (chunk) => {
                    data += chunk;
                    const lines = data.split('\n');
                    // Keep everything up to the last complete line
                    data = lines.pop() || ''; // The last part may not be a complete line
                    newLogs.push(...lines.filter(line => line.trim() !== ''));
                });

                // When the stream ends, send the response
                stream.on('end', () => {
                    const newPosition = data.length === 0 ? fileSize : fileSize - data.length;
                    console.log(`New position: ${newPosition}/${fileSize}`)
                    console.log('Logs returned', newLogs.length)

                    resolve(NextResponse.json(
                        { logs: newLogs, position: newPosition },
                        { status: 200 }
                    ));
                });

                // Handle stream error
                stream.on('error', (error) => {
                    console.error(error);
                    reject(NextResponse.json({ error: "Internal server error." }, { status: 500 }));
                });
            });
        } catch (error) {
            console.error(error);
            reject(NextResponse.json({ error: "Internal server error." }, { status: 500 }));
        }
    });
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