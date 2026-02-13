import { NginxLog } from "./types";

export type Period = '24 hours' | 'week' | 'month' | '6 months' | 'all time';

export const periodStart = (period: Period): number | null => {
    const date = new Date();
    switch (period) {
        case '24 hours':
            date.setHours(date.getHours() - 24);
            return date.getTime();
        case 'week':
            date.setDate(date.getDate() - 7);
            return date.getTime();
        case 'month':
            date.setMonth(date.getMonth() - 1);
            return date.getTime();
        case '6 months':
            date.setMonth(date.getMonth() - 6);
            return date.getTime();
        default:
            return null;
    }
}

export const getPeriodRange = (period: Period, data: NginxLog[]) => {
    const start = periodStart(period);
    if (!start) {
        // Use O(1) sorted variant — callers always pass sorted filteredData
        const range = getDateRangeSorted(data);
        if (!range) {
            return null;
        }
        return { start: new Date(range.start), end: new Date(range.end) };
    }

    // start is now a number (epoch ms) — wrap in Date for callers using hoursInRange etc.
    return { start: new Date(start), end: new Date() };
}

export const hoursInRange = (start: Date, end: Date): number => {
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    // Ensure we return at least 1 hour to prevent division by zero
    return Math.max(hours, 1);
};


export const getDateRange = (data: NginxLog[]) => {
    if (!data || data.length === 0) {
        return null; // Handle empty or null input
    }

    const range = { start: Infinity, end: -Infinity }

    for (const row of data) {
        if (!row.timestamp) {
            continue
        }
        // timestamp is now a number — no .getTime() needed
        if (row.timestamp < range.start) {
            range.start = row.timestamp;
        }
        if (row.timestamp > range.end) {
            range.end = row.timestamp
        }
    }

    return range;
}

// O(1) date range for data sorted ascending by timestamp.
// Scans only from the two ends to skip any null-timestamp entries.
export const getDateRangeSorted = (data: NginxLog[]) => {
    if (!data || data.length === 0) return null;

    // timestamp is now a number — no .getTime() needed
    let start: number | undefined;
    for (let i = 0; i < data.length; i++) {
        if (data[i].timestamp !== null) { start = data[i].timestamp!; break; }
    }

    let end: number | undefined;
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].timestamp !== null) { end = data[i].timestamp!; break; }
    }

    if (start === undefined || end === undefined) return null;
    return { start, end };
}