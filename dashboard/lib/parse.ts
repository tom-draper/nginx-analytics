import { Data, LogRow } from "./types";

export function parseLogs(logs: string[]) {
    const regex = /^(\S+) - - \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+) "([^"]+)" "([^"]+)"/;

    const data: Data = [];
    for (const row of logs) {
        const matches = row.match(regex);

        if (matches) {
            const logData: LogRow = {
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