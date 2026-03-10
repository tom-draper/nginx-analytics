/// <reference lib="webworker" />
export type {};

import type { NginxLog } from './types';
import type { Filter } from './filter';
import type { Settings } from './settings';
import { isBotOrCrawler } from './user-agent';
import { periodStart, getDateRange, getPeriodRange, hoursInRange } from './period';
import { getVersion } from './get-version';
import { getClient, getOS, getDevice } from './get-device-info';
import { parseNginxLogs } from './parse';
import { getUserId } from './user';
import type { Period } from './period';

type ComputeMessage = {
    type: 'compute';
    seq: number;
    filter: Filter;
    settings: Settings;
    locationMap: [string, string][]; // [ipAddress, country]
};

type ParseAndStoreMessage = {
    type: 'parseAndStore';
    rawLogs: string[];
    logFormat?: string;
};

export type WorkerResult = {
    seq: number;
    endpointCounts: [string, number][];
    referrerCounts: [string, number][];
    responseSizes: number[];
    versionCounts: Record<string, number>;
    clientCounts: Record<string, number>;
    osCounts: Record<string, number>;
    deviceTypeCounts: Record<string, number>;
    hourCounts: number[];
    dayCounts: number[];
    // Activity
    activityBuckets: { timestamp: number; requests: number; users: number }[];
    activitySuccessRates: { timestamp: number; successRate: number | null }[];
    activityPeriodLabels: { start: string; end: string };
    activityStepSize: number;
    activityTimeUnit: 'minute' | 'hour' | 'day';
    // Requests
    requestsTotal: number;
    requestsPerHour: number;
    requestsTrend: { date: string; count: number }[];
    // Users
    usersTotal: number;
    usersPerHour: number;
    usersTrend: { date: string; count: number }[];
    // SuccessRate
    overallSuccessRate: number | null;
    successRateTrend: { date: string; rate: number }[];
    // Location
    locationCounts: { country: string; count: number }[];
    unknownIPs: string[];
};

let logs: NginxLog[] = [];
let logsWithoutBots: NginxLog[] = [];
let cachedBaseKey = '';
let cachedFilteredData: NginxLog[] = [];
let cachedVersionKey = '';
let cachedVersionFilteredData: NginxLog[] = [];
let cachedDeviceKey = '';
let cachedDeviceFilteredData: NginxLog[] = [];
let cachedHourKey = '';
let cachedHourFilteredData: NginxLog[] = [];
let cachedDayKey = '';
let cachedDayFilteredData: NginxLog[] = [];

function getDayId(date: Date): number {
    return new Date(date).setHours(0, 0, 0, 0);
}
function getHourId(date: Date): number {
    return new Date(date).setMinutes(0, 0, 0);
}
function get6HourId(date: Date): number {
    const ms6h = 6 * 60 * 60 * 1000;
    return Math.floor(date.getTime() / ms6h) * ms6h;
}
function get5MinuteId(date: Date): number {
    const msPer5Min = 5 * 60 * 1000;
    return Math.round(date.getTime() / msPer5Min) * msPer5Min;
}
function incrementDate(date: Date, period: Period): Date {
    switch (period) {
        case '24 hours': return new Date(date.setMinutes(date.getMinutes() + 5));
        case 'week': return new Date(date.setHours(date.getHours() + 1));
        case 'month': return new Date(date.setHours(date.getHours() + 6));
        default: return new Date(date.setDate(date.getDate() + 1));
    }
}

function consolidateTo6(buckets: { date: string; count: number }[]): { date: string; count: number }[] {
    if (buckets.length <= 6) return buckets;
    const size = Math.ceil(buckets.length / 6);
    const result = [];
    for (let i = 0; i < buckets.length; i += size) {
        const chunk = buckets.slice(i, i + size);
        result.push({ date: chunk[0].date, count: chunk.reduce((s, b) => s + b.count, 0) });
    }
    return result;
}

function consolidateSrTo6(arr: { date: string; rate: number; requests: number; successes: number }[]): { date: string; rate: number }[] {
    if (arr.length <= 6) return arr.map(({ date, rate }) => ({ date, rate }));
    const size = Math.ceil(arr.length / 6);
    const result: { date: string; rate: number }[] = [];
    for (let i = 0; i < arr.length; i += size) {
        const chunk = arr.slice(i, i + size);
        const totalReq = chunk.reduce((s, b) => s + b.requests, 0);
        const totalSuc = chunk.reduce((s, b) => s + b.successes, 0);
        result.push({ date: chunk[0].date, rate: totalReq > 0 ? totalSuc / totalReq : 0 });
    }
    return result;
}

self.onmessage = (e: MessageEvent<ComputeMessage | ParseAndStoreMessage>) => {
    const { data } = e;

    if (data.type === 'parseAndStore') {
        const parsed = parseNginxLogs(data.rawLogs, data.logFormat);
        logs = [...logs, ...parsed];
        logsWithoutBots = [...logsWithoutBots, ...parsed.filter(row => !isBotOrCrawler(row.userAgent))];
        cachedBaseKey = '';
        cachedVersionKey = '';
        cachedDeviceKey = '';
        cachedHourKey = '';
        cachedDayKey = '';
        return;
    }

    const { seq, filter, settings, locationMap: locationMapEntries } = data;
    const locationMap = new Map(locationMapEntries);

    // Base filter with caching
    const baseKey = `${filter.period}|${filter.location ?? ''}|${filter.path ?? ''}|${filter.method ?? ''}|${JSON.stringify(filter.status)}|${filter.referrer ?? ''}|${settings.ignore404}|${settings.excludeBots}`;

    let filteredData: NginxLog[];
    if (baseKey === cachedBaseKey) {
        filteredData = cachedFilteredData;
    } else {
        const source = settings.excludeBots ? logsWithoutBots : logs;
        const start = periodStart(filter.period);
        const result: NginxLog[] = [];
        for (const row of source) {
            let validStatus = true;
            if (filter.status !== null) {
                if (typeof filter.status === 'number') {
                    validStatus = row.status === filter.status;
                } else {
                    validStatus = false;
                    for (const range of filter.status) {
                        if (row.status !== null && range[0] <= row.status && range[1] >= row.status) {
                            validStatus = true;
                            break;
                        }
                    }
                }
            }
            if (
                (start === null || (row.timestamp && row.timestamp > start))
                && (filter.location === null || locationMap.get(row.ipAddress) === filter.location)
                && (filter.path === null || row.path === filter.path)
                && (filter.method === null || row.method === filter.method)
                && (filter.status === null || validStatus)
                && (!settings.ignore404 || row.status !== 404)
                && (filter.referrer === null || row.referrer === filter.referrer)
            ) {
                result.push(row);
            }
        }
        filteredData = result;
        cachedFilteredData = result;
        cachedBaseKey = baseKey;
    }

    // Version filter — cached
    const versionKey = `${baseKey}|${filter.version ?? ''}`;
    let versionFilteredData: NginxLog[];
    if (versionKey === cachedVersionKey) {
        versionFilteredData = cachedVersionFilteredData;
    } else {
        versionFilteredData = filter.version === null
            ? filteredData
            : filteredData.filter(row => getVersion(row.path) === filter.version);
        cachedVersionFilteredData = versionFilteredData;
        cachedVersionKey = versionKey;
    }

    // Device filter — cached
    const deviceKey = `${versionKey}|${filter.client ?? ''}|${filter.os ?? ''}|${filter.deviceType ?? ''}`;
    let deviceFilteredData: NginxLog[];
    if (deviceKey === cachedDeviceKey) {
        deviceFilteredData = cachedDeviceFilteredData;
    } else {
        let result = versionFilteredData;
        if (filter.client !== null) result = result.filter(row => getClient(row.userAgent) === filter.client);
        if (filter.os !== null) result = result.filter(row => getOS(row.userAgent) === filter.os);
        if (filter.deviceType !== null) result = result.filter(row => getDevice(row.userAgent) === filter.deviceType);
        deviceFilteredData = result;
        cachedDeviceFilteredData = result;
        cachedDeviceKey = deviceKey;
    }

    // Hour filter — cached
    const hourKey = `${deviceKey}|${filter.hour ?? ''}`;
    let hourFilteredData: NginxLog[];
    if (hourKey === cachedHourKey) {
        hourFilteredData = cachedHourFilteredData;
    } else {
        hourFilteredData = filter.hour === null
            ? deviceFilteredData
            : deviceFilteredData.filter(row => row.timestamp?.getHours() === filter.hour);
        cachedHourFilteredData = hourFilteredData;
        cachedHourKey = hourKey;
    }

    // Day filter — cached
    const dayKey = `${hourKey}|${filter.dayOfWeek ?? ''}`;
    let dayFilteredData: NginxLog[];
    if (dayKey === cachedDayKey) {
        dayFilteredData = cachedDayFilteredData;
    } else {
        dayFilteredData = filter.dayOfWeek === null
            ? hourFilteredData
            : hourFilteredData.filter(row => row.timestamp?.getDay() === filter.dayOfWeek);
        cachedDayFilteredData = dayFilteredData;
        cachedDayKey = dayKey;
    }

    // Aggregations
    const endpointCounts = new Map<string, number>();
    const referrerCounts = new Map<string, number>();
    const responseSizes: number[] = [];
    for (const row of dayFilteredData) {
        const path = settings.ignoreParams ? row.path.split('?')[0] : row.path;
        const epKey = `${path}::${row.method}::${row.status}`;
        endpointCounts.set(epKey, (endpointCounts.get(epKey) ?? 0) + 1);
        if (row.referrer && row.referrer !== '-') {
            referrerCounts.set(row.referrer, (referrerCounts.get(row.referrer) ?? 0) + 1);
        }
        if (row.responseSize) responseSizes.push(row.responseSize);
    }

    const versionCounts: Record<string, number> = {};
    for (const row of filteredData) {
        const v = getVersion(row.path);
        if (v) versionCounts[v] = (versionCounts[v] ?? 0) + 1;
    }

    const clientCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const deviceTypeCounts: Record<string, number> = {};
    for (const row of versionFilteredData) {
        const c = getClient(row.userAgent);
        clientCounts[c] = (clientCounts[c] ?? 0) + 1;
        const o = getOS(row.userAgent);
        osCounts[o] = (osCounts[o] ?? 0) + 1;
        const d = getDevice(row.userAgent);
        deviceTypeCounts[d] = (deviceTypeCounts[d] ?? 0) + 1;
    }

    const hourCounts = new Array(24).fill(0);
    for (const row of deviceFilteredData) {
        if (row.timestamp) hourCounts[row.timestamp.getHours()]++;
    }

    const dayCounts = new Array(7).fill(0);
    for (const row of hourFilteredData) {
        if (row.timestamp) dayCounts[row.timestamp.getDay()]++;
    }

    // ---- Activity pre-computation ----
    const actRange = filter.period === 'all time' ? getDateRange(dayFilteredData) : null;

    let getTimeId: (d: Date) => number;
    let actStepSize: number;
    let actTimeUnit: 'minute' | 'hour' | 'day';
    switch (filter.period) {
        case '24 hours':
            getTimeId = get5MinuteId; actStepSize = 300000; actTimeUnit = 'minute'; break;
        case 'week':
            getTimeId = getHourId; actStepSize = 3600000; actTimeUnit = 'hour'; break;
        case 'month':
            getTimeId = get6HourId; actStepSize = 21600000; actTimeUnit = 'hour'; break;
        default:
            getTimeId = getDayId; actStepSize = 86400000; actTimeUnit = 'day'; break;
    }
    if (filter.period === 'all time' && actRange) {
        const diff = actRange.end - actRange.start;
        if (diff <= 86400000) { getTimeId = get5MinuteId; actStepSize = 300000; actTimeUnit = 'minute'; }
        else if (diff <= 604800000) { getTimeId = getHourId; actStepSize = 3600000; actTimeUnit = 'hour'; }
    }

    const actStart = periodStart(filter.period);
    let actCurrent: Date;
    let actEnd: Date;
    let actPeriodLabels = { start: '', end: '' };

    if (actStart === null) {
        if (!actRange) {
            actCurrent = new Date();
            actEnd = new Date();
        } else {
            actCurrent = new Date(actRange.start);
            actEnd = new Date(actRange.end);
            actPeriodLabels = {
                start: actCurrent.toLocaleDateString(),
                end: actEnd.toLocaleDateString(),
            };
        }
    } else {
        actEnd = new Date();
        actCurrent = new Date(actStart);
        switch (filter.period) {
            case '24 hours': actPeriodLabels = { start: '24 hours ago', end: 'Now' }; break;
            case 'week': actPeriodLabels = { start: 'One week ago', end: 'Now' }; break;
            case 'month': actPeriodLabels = { start: 'One month ago', end: 'Now' }; break;
            case '6 months': actPeriodLabels = { start: 'Six months ago', end: 'Now' }; break;
        }
    }

    const chartPoints: Record<number, { requests: number; users: Set<string> }> = {};
    const ratePoints: Record<number, { success: number; total: number }> = {};

    while (actCurrent <= actEnd) {
        const id = getTimeId(actCurrent);
        chartPoints[id] = { requests: 0, users: new Set() };
        ratePoints[id] = { success: 0, total: 0 };
        actCurrent = incrementDate(actCurrent, filter.period);
    }

    for (const row of dayFilteredData) {
        if (!row.timestamp) continue;
        const id = getTimeId(row.timestamp);
        const uid = `${row.ipAddress}::${row.userAgent}`;
        if (chartPoints[id]) {
            chartPoints[id].requests++;
            chartPoints[id].users.add(uid);
        } else {
            chartPoints[id] = { requests: 1, users: new Set([uid]) };
        }
        if (row.status) {
            if (!ratePoints[id]) ratePoints[id] = { success: 0, total: 0 };
            if (row.status >= 200 && row.status <= 399) ratePoints[id].success++;
            ratePoints[id].total++;
        }
    }

    const activityBuckets = Object.entries(chartPoints)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([ts, v]) => ({ timestamp: Number(ts), requests: v.requests - v.users.size, users: v.users.size }));

    const activitySuccessRates = Object.entries(ratePoints)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([ts, v]) => ({ timestamp: Number(ts), successRate: v.total ? v.success / v.total : null }));

    // ---- Requests pre-computation ----
    const reqPeriodRange = getPeriodRange(filter.period, dayFilteredData);
    const reqHours = reqPeriodRange ? hoursInRange(reqPeriodRange.start, reqPeriodRange.end) : 1;
    const reqTotal = dayFilteredData.length;
    const reqPerHour = reqTotal / reqHours;

    const bucketFormat: 'hour' | 'day' = filter.period === '24 hours' ? 'hour' : 'day';
    const reqBuckets = new Map<string, number>();
    const userBuckets = new Map<string, number>();
    const srBuckets = new Map<string, { requests: number; successes: number }>();

    if (reqPeriodRange) {
        const cur = new Date(reqPeriodRange.start.getTime());
        const endT = reqPeriodRange.end;
        while (cur <= endT) {
            const key = bucketFormat === 'hour'
                ? `${cur.toISOString().split('T')[0]} ${cur.getHours()}`
                : cur.toISOString().split('T')[0];
            reqBuckets.set(key, 0);
            userBuckets.set(key, 0);
            srBuckets.set(key, { requests: 0, successes: 0 });
            if (bucketFormat === 'hour') cur.setHours(cur.getHours() + 1);
            else cur.setDate(cur.getDate() + 1);
        }
    }

    const uniqueUserIds = new Set<string>();
    for (const row of dayFilteredData) {
        const ts = row.timestamp;
        if (!ts) continue;
        const key = bucketFormat === 'hour'
            ? `${ts.toISOString().split('T')[0]} ${ts.getHours()}`
            : ts.toISOString().split('T')[0];
        reqBuckets.set(key, (reqBuckets.get(key) ?? 0) + 1);
        userBuckets.set(key, (userBuckets.get(key) ?? 0) + 1);
        const uid = getUserId(row.ipAddress, row.userAgent);
        if (uid) uniqueUserIds.add(uid);
        if (!srBuckets.has(key)) srBuckets.set(key, { requests: 1, successes: 0 });
        else srBuckets.get(key)!.requests++;
        if (row.status !== null && row.status >= 200 && row.status <= 399) {
            srBuckets.get(key)!.successes++;
        }
    }

    const requestsTrend = consolidateTo6(Array.from(reqBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })));

    // ---- Users pre-computation ----
    const usersTotal = uniqueUserIds.size;
    const usersPerHour = usersTotal / reqHours;
    const usersTrend = consolidateTo6(Array.from(userBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })));

    // ---- SuccessRate pre-computation ----
    let srTotalSuccess = 0;
    let srTotalCount = 0;
    for (const row of dayFilteredData) {
        if (row.status === null) continue;
        srTotalCount++;
        if (row.status >= 200 && row.status <= 399) srTotalSuccess++;
    }
    const overallSuccessRate = srTotalCount > 0 ? srTotalSuccess / srTotalCount : null;

    const srArr = Array.from(srBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { requests, successes }]) => ({ date, rate: requests > 0 ? successes / requests : 0, requests, successes }));
    const successRateTrend = consolidateSrTo6(srArr);

    // ---- Location pre-computation ----
    const locationCountMap: Record<string, number> = {};
    const seenInFilter = new Set<string>();
    const unknownIPs: string[] = [];
    for (const row of dayFilteredData) {
        const loc = locationMap.get(row.ipAddress);
        if (loc) {
            locationCountMap[loc] = (locationCountMap[loc] ?? 0) + 1;
        }
        if (!seenInFilter.has(row.ipAddress)) {
            seenInFilter.add(row.ipAddress);
            if (!locationMap.has(row.ipAddress)) {
                unknownIPs.push(row.ipAddress);
            }
        }
    }
    const locationCounts = Object.entries(locationCountMap)
        .sort(([, a], [, b]) => b - a)
        .map(([country, count]) => ({ country, count }));

    const result: WorkerResult = {
        seq,
        endpointCounts: Array.from(endpointCounts),
        referrerCounts: Array.from(referrerCounts),
        responseSizes,
        versionCounts,
        clientCounts,
        osCounts,
        deviceTypeCounts,
        hourCounts,
        dayCounts,
        activityBuckets,
        activitySuccessRates,
        activityPeriodLabels: actPeriodLabels,
        activityStepSize: actStepSize,
        activityTimeUnit: actTimeUnit,
        requestsTotal: reqTotal,
        requestsPerHour: reqPerHour,
        requestsTrend,
        usersTotal,
        usersPerHour,
        usersTrend,
        overallSuccessRate,
        successRateTrend,
        locationCounts,
        unknownIPs,
    };

    self.postMessage(result);
};
