import { NginxError, NginxLog } from "./types";

// ---------------------------------------------------------------------------
// Default compiled regex (handles standard combined + NPM vcombined prefix)
// ---------------------------------------------------------------------------

const LOG_REGEX = /^(?:\S+ )?(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+) "([^"]*)" "([^"]*)"/;

const DEFAULT_FIELDS: FieldMapping = {
    ipAddress: 1, timestamp: 2, method: 3, path: 4,
    httpVersion: 5, status: 6, responseSize: 7, referrer: 8, userAgent: 9,
};

// ---------------------------------------------------------------------------
// Log format → regex conversion
// ---------------------------------------------------------------------------

type FieldName = 'ipAddress' | 'timestamp' | 'method' | 'path' | 'httpVersion' | 'status' | 'responseSize' | 'referrer' | 'userAgent';

interface FieldMapping {
    ipAddress?: number;
    timestamp?: number;
    method?: number;
    path?: number;
    httpVersion?: number;
    status?: number;
    responseSize?: number;
    referrer?: number;
    userAgent?: number;
}

interface CompiledFormat {
    regex: RegExp;
    fields: FieldMapping;
}

// Nginx variables that map to NginxLog fields (captured groups)
const CAPTURED_VARS: Record<string, { pattern: string; field?: FieldName; fields?: FieldName[] }> = {
    remote_addr:        { pattern: '(\\S+)',         field: 'ipAddress' },
    time_local:         { pattern: '([^\\]]+)',       field: 'timestamp' },
    time_iso8601:       { pattern: '(\\S+)',          field: 'timestamp' },
    request:            { pattern: '(\\S+) (\\S+) (\\S+)', fields: ['method', 'path', 'httpVersion'] },
    request_method:     { pattern: '(\\S+)',          field: 'method' },
    request_uri:        { pattern: '(\\S+)',          field: 'path' },
    uri:                { pattern: '(\\S+)',          field: 'path' },
    server_protocol:    { pattern: '(\\S+)',          field: 'httpVersion' },
    status:             { pattern: '(\\d{3})',        field: 'status' },
    body_bytes_sent:    { pattern: '(\\d+)',          field: 'responseSize' },
    bytes_sent:         { pattern: '(\\d+)',          field: 'responseSize' },
    http_referer:       { pattern: '([^"]*)',         field: 'referrer' },
    http_user_agent:    { pattern: '([^"]*)',         field: 'userAgent' },
};

// Nginx variables that are consumed but not stored (non-capturing)
const UNCAPTURED_VARS: Record<string, string> = {
    remote_user:            '\\S+',
    host:                   '\\S+',
    server_name:            '\\S+',
    server_port:            '\\d+',
    scheme:                 '\\S+',
    upstream_addr:          '\\S+',
    upstream_cache_status:  '\\S+',
    upstream_status:        '\\d+',
    request_time:           '[\\d.]+',
    upstream_response_time: '[\\d.-]+',
    upstream_connect_time:  '[\\d.-]+',
    upstream_header_time:   '[\\d.-]+',
    gzip_ratio:             '[\\d.]+',
    connection:             '\\d+',
    connection_requests:    '\\d+',
    pipe:                   '\\S+',
    http_x_forwarded_for:   '[^"]*',
    http_cookie:            '[^"]*',
    msec:                   '[\\d.]+',
    request_length:         '\\d+',
    ssl_protocol:           '\\S+',
    ssl_cipher:             '\\S+',
};

export function logFormatToRegex(format: string): CompiledFormat {
    let pattern = '^';
    let groupIndex = 0;
    const fields: FieldMapping = {};

    let i = 0;
    while (i < format.length) {
        if (format[i] === '$') {
            // Extract variable name (word chars only)
            let j = i + 1;
            while (j < format.length && /\w/.test(format[j])) j++;
            const varName = format.slice(i + 1, j);

            const captured = CAPTURED_VARS[varName];
            if (captured) {
                if (captured.fields) {
                    captured.fields.forEach((f, idx) => {
                        fields[f] = groupIndex + 1 + idx;
                    });
                    groupIndex += captured.fields.length;
                } else if (captured.field) {
                    fields[captured.field] = ++groupIndex;
                }
                pattern += captured.pattern;
            } else {
                pattern += UNCAPTURED_VARS[varName] ?? '\\S+';
            }
            i = j;
        } else {
            // Escape regex special chars in literal text
            pattern += format[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            i++;
        }
    }

    return { regex: new RegExp(pattern), fields };
}

// Cache compiled formats so we don't recompile on every parse call
const formatCache = new Map<string, CompiledFormat>();

function getCompiledFormat(logFormat?: string): CompiledFormat {
    if (!logFormat) return { regex: LOG_REGEX, fields: DEFAULT_FIELDS };

    let compiled = formatCache.get(logFormat);
    if (!compiled) {
        compiled = logFormatToRegex(logFormat);
        formatCache.set(logFormat, compiled);
    }
    return compiled;
}

// ---------------------------------------------------------------------------
// Timestamp parsing
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Access log parsing
// ---------------------------------------------------------------------------

export function parseNginxLogs(logs: string[], logFormat?: string): NginxLog[] {
    const { regex, fields } = getCompiledFormat(logFormat);

    const data: NginxLog[] = [];
    for (const row of logs) {
        const matches = row.match(regex);
        if (!matches) continue;

        const get = (idx?: number) => (idx && idx < matches.length) ? matches[idx] : '';

        data.push({
            ipAddress:    get(fields.ipAddress),
            timestamp:    fields.timestamp ? parseDate(get(fields.timestamp)) || null : null,
            method:       get(fields.method),
            path:         get(fields.path),
            httpVersion:  get(fields.httpVersion),
            status:       fields.status ? parseInt(get(fields.status)) || null : null,
            responseSize: fields.responseSize ? parseInt(get(fields.responseSize)) || null : null,
            referrer:     get(fields.referrer),
            userAgent:    get(fields.userAgent),
        });
    }
    return data;
}

// ---------------------------------------------------------------------------
// Error log parsing
// ---------------------------------------------------------------------------

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
