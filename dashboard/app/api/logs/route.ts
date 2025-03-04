import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
// import { promisify } from "util";

// const statFile = promisify(fs.stat);

const nginxAccessPath = process.env.NGINX_ACCESS_PATH;
const nginxErrorPath = process.env.NGINX_ERROR_PATH;

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

    const lastPosition = parseInt(searchParams.get('position') || '') || 0;

    if (logType === 'access') {
        if (nginxAccessPath) {
            return await serveLocalLogs(nginxAccessPath, lastPosition);
        } else if (nginxAccessUrl) {
            return await serveRemoteLogs(nginxAccessUrl, authToken);
        } else {
            console.log('No access logs.');
            return new NextResponse(null, {status: 400});
        }
    } else if (logType === 'error') {
        if (nginxErrorPath) {
            return await serveLocalLogs(nginxErrorPath, lastPosition);
        } else if (nginxErrorUrl) {
            return await serveRemoteLogs(nginxErrorUrl, authToken);
        } else {
            console.log('No error logs.');
            return new NextResponse(null, {status: 400});
        }
    } else {
        return new NextResponse(null, {status: 400});
    }

}

async function serveLocalLogs(filePath: string, lastPosition: number) {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
        console.error('File not found.');
        return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    return new Promise<NextResponse>((resolve, reject) => {
        try {
            const position = Number(lastPosition);

            console.log('Last position', position);

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
                    console.log('Chunk', chunk)
                    data += chunk;
                    const lines = data.split('\n');
                    // Keep everything up to the last complete line
                    data = lines.pop() || ''; // The last part may not be a complete line
                    newLogs.push(...lines.filter(line => line.trim() !== ''));
                });

                // When the stream ends, send the response
                stream.on('end', () => {
                    console.log('New logs', newLogs);
                    const newPosition = data.length === 0 ? fileSize : fileSize - data.length;
                    console.log('New position', data, newPosition, data.length, fileSize);

                    resolve(new NextResponse(
                        JSON.stringify({
                            logs: newLogs,
                            position: newPosition
                        }),
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

async function serveRemoteLogs(url: string, authToken: string | undefined) {
    //todo
    return new NextResponse(null, {status: 200});
}
