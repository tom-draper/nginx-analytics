import { NginxError, NginxLog } from "./types";

const LOG_REGEX = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+) "([^"]+)" "([^"]+)"/;

const MONTH_MAP: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

// Parse NGINX timestamp: DD/Mon/YYYY:HH:MM:SS +HHMM
function parseDate(date: string): Date | undefined {
    if (!date || date.length < 20) return undefined;

    const day = (date.charCodeAt(0) - 48) * 10 + (date.charCodeAt(1) - 48);
    const month = MONTH_MAP[date.slice(3, 6)];
    if (month === undefined) return undefined;
    const year = (date.charCodeAt(7) - 48) * 1000 + (date.charCodeAt(8) - 48) * 100
               + (date.charCodeAt(9) - 48) * 10 + (date.charCodeAt(10) - 48);
    const hours   = (date.charCodeAt(12) - 48) * 10 + (date.charCodeAt(13) - 48);
    const minutes = (date.charCodeAt(15) - 48) * 10 + (date.charCodeAt(16) - 48);
    const seconds = (date.charCodeAt(18) - 48) * 10 + (date.charCodeAt(19) - 48);

    let tzOffsetMs = 0;
    if (date.length >= 26) {
        const tzSign = date.charCodeAt(21) === 43 ? 1 : -1; // 43 = '+'
        const tzHours = (date.charCodeAt(22) - 48) * 10 + (date.charCodeAt(23) - 48);
        const tzMins  = (date.charCodeAt(24) - 48) * 10 + (date.charCodeAt(25) - 48);
        tzOffsetMs = tzSign * (tzHours * 60 + tzMins) * 60000;
    }

    return new Date(Date.UTC(year, month, day, hours, minutes, seconds) - tzOffsetMs);
}

export function parseNginxLogs(logs: string[]) {
    const data: NginxLog[] = [];
    for (const row of logs) {
        const matches = row.match(LOG_REGEX);

        if (matches) {
            const logData: NginxLog = {
                ipAddress: matches[1],
                timestamp: matches[2] ? parseDate(matches[2]) || null : null,
                method: matches[3],
                path: matches[4],
                httpVersion: matches[5],
                status: matches[6] ? parseInt(matches[6]) || null : null,
                responseSize: matches[7] ? parseInt(matches[7]) || null : null,
                referrer: matches[8],
                userAgent: matches[9]
            };
            data.push(logData);
        }
    }
    return data;
}

const TIMESTAMP_PATTERN = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/;
const LEVEL_PATTERN = /\[(debug|info|notice|warn|error|crit|alert|emerg)\]/i;
const PID_PATTERN = /(\d+)#(\d+)/;
const CID_PATTERN = /\*(\d+)/;
const CLIENT_PATTERN = /client: (\d+\.\d+\.\d+\.\d+)/;
const SERVER_PATTERN = /server: (\S+)/;
const REQUEST_PATTERN = /request: "([^"]+)"/;
const REFERRER_PATTERN = /referrer: "([^"]+)"/;
const HOST_PATTERN = /host: "([^"]+)"/;

export function parseNginxErrors(logLines: string[]): NginxError[] {
    return logLines
        .filter(line => line.trim().length > 0)
        .map(line => {
            // Basic pattern: YYYY/MM/DD HH:MM:SS [level] pid#tid: *cid message
            const timestampMatch = line.match(TIMESTAMP_PATTERN);
            const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();

            const levelMatch = line.match(LEVEL_PATTERN);
            const level = levelMatch ? levelMatch[1].toLowerCase() : "unknown";

            const pidMatch = line.match(PID_PATTERN);
            const pid = pidMatch ? parseInt(pidMatch[1]) : 0;
            const tid = pidMatch ? pidMatch[2] : "0";

            const cidMatch = line.match(CID_PATTERN);
            const cid = cidMatch ? cidMatch[1] : "0";

            let clientAddress: string | undefined;
            let serverAddress: string | undefined;
            let request: string | undefined;
            let referrer: string | undefined;
            let host: string | undefined;

            const clientMatch = line.match(CLIENT_PATTERN);
            if (clientMatch) clientAddress = clientMatch[1];

            const serverMatch = line.match(SERVER_PATTERN);
            if (serverMatch) serverAddress = serverMatch[1];

            const requestMatch = line.match(REQUEST_PATTERN);
            if (requestMatch) request = requestMatch[1];

            const referrerMatch = line.match(REFERRER_PATTERN);
            if (referrerMatch) referrer = referrerMatch[1];

            const hostMatch = line.match(HOST_PATTERN);
            if (hostMatch) host = hostMatch[1];

            let message = line;
            if (cidMatch) {
                const cidIndex = line.indexOf(`*${cid}`);
                if (cidIndex !== -1) {
                    message = line.substring(cidIndex + cid.length + 1).trim();
                }
            } else {
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
