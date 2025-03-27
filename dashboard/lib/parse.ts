import { NginxError, NginxLog } from "./types";

export function parseNginxLogs(logs: string[]) {
    const regex = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+) "([^"]+)" "([^"]+)"/;

    const data: NginxLog[] = [];
    for (const row of logs) {
        const matches = row.match(regex);

        if (matches) {
            const logData: NginxLog = {
                ipAddress: matches[1],
                timestamp: matches[2] ? parseDate(matches[2]) || null : null,
                method: matches[3],
                path: matches[4],
                httpVersion: matches[5],
                status: matches[6] ? parseInt(matches[6]) || null : null,
                responseSize: matches[6] ? parseInt(matches[7]) || null : null,
                referrer: matches[8],
                userAgent: matches[9]
            };
            data.push(logData);
        }
    }
    return data;
}

function parseDate(date: string) {
    if (!date) {
        return;
    }

    const dateString = date.replace(/:/, ' ').replace(/([A-Za-z]{3})/, (match) => {
        return match.slice(0, 1).toUpperCase() + match.slice(1).toLowerCase(); // Capitalize month
    });

    return new Date(dateString);
}

export function parseNginxErrors(logLines: string[]): NginxError[] {
    return logLines
        .filter(line => line.trim().length > 0)
        .map(line => {
            // Basic pattern: YYYY/MM/DD HH:MM:SS [level] pid#tid: *cid message
            console.log(line);
            const timestampPattern = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/;
            const levelPattern = /\[(debug|info|notice|warn|error|crit|alert|emerg)\]/i;
            const pidPattern = /(\d+)#(\d+)/;
            const cidPattern = /\*(\d+)/;

            // Extract timestamp
            const timestampMatch = line.match(timestampPattern);
            const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();

            // Extract log level
            const levelMatch = line.match(levelPattern);
            const level = levelMatch ? levelMatch[1].toLowerCase() : "unknown";

            // Extract PID and TID
            const pidMatch = line.match(pidPattern);
            const pid = pidMatch ? parseInt(pidMatch[1]) : 0;
            const tid = pidMatch ? pidMatch[2] : "0";

            // Extract connection ID
            const cidMatch = line.match(cidPattern);
            const cid = cidMatch ? cidMatch[1] : "0";

            // Extract common fields
            let clientAddress: string | undefined;
            let serverAddress: string | undefined;
            let request: string | undefined;
            let referrer: string | undefined;
            let host: string | undefined;

            // Extract client IP
            const clientMatch = line.match(/client: (\d+\.\d+\.\d+\.\d+)/);
            if (clientMatch) clientAddress = clientMatch[1];

            // Extract server address
            const serverMatch = line.match(/server: (\S+)/);
            if (serverMatch) serverAddress = serverMatch[1];

            // Extract request
            const requestMatch = line.match(/request: "([^"]+)"/);
            if (requestMatch) request = requestMatch[1];

            // Extract referrer
            const referrerMatch = line.match(/referrer: "([^"]+)"/);
            if (referrerMatch) referrer = referrerMatch[1];

            // Extract host
            const hostMatch = line.match(/host: "([^"]+)"/);
            if (hostMatch) host = hostMatch[1];

            // Extract message - anything after the cid
            let message = line;
            if (cidMatch) {
                const cidIndex = line.indexOf(`*${cid}`);
                if (cidIndex !== -1) {
                    message = line.substring(cidIndex + cid.length + 1).trim();
                }
            } else {
                // If no cid pattern found, try to extract message after the level and pid
                const levelIndex = line.indexOf(`[${level}]`);
                const pidIndex = line.indexOf(`${pid}#`);
                if (levelIndex !== -1 && pidIndex !== -1) {
                    message = line.substring(pidIndex + pid.toString().length + tid.length + 1).trim();
                }
            }

            return {
                timestamp,
                level,
                pid,
                tid,
                cid,
                message,
                clientAddress,
                serverAddress,
                request,
                referrer,
                host
            };
        });
}

