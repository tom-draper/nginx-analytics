import { NginxLog } from "./types";

export type Period = '24 hours' | 'week' | 'month' | '6 months' | 'all time';

export const periodStart = (period: Period) => {
    const date = new Date();
    switch (period) {
        case '24 hours':
            date.setHours(date.getHours() - 24)
            return date;
        case 'week':
            date.setDate(date.getDate() - 7)
            return date;
        case 'month':
            date.setMonth(date.getMonth() - 1)
            return date;
        case '6 months':
            date.setMonth(date.getMonth() - 6)
            return date;
        default:
            return null;
    }
}

export const getPeriodRange = (period: Period, data: NginxLog[]) => {
    const start = periodStart(period);
    if (!start) {
        const range = getDateRange(data);
        if (!range) {
            return null;
        }
        return { start: new Date(range.start), end: new Date(range.end) };
    }

    return { start, end: new Date() };
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
        const time = row.timestamp.getTime()
        if (time < range.start) {
            range.start = time;
        }
        if (time > range.end) {
            range.end = time
        }
    }

    return range;
}