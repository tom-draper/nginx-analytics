import { NginxLog } from '../types';
import { Filter } from '../filter';
import { Settings } from '../settings';
import { periodStart, Period } from '../period';
import { getVersion } from '../get-version';

// ─── Histogram helpers ────────────────────────────────────────────────────────

type Histogram = { bins: number[]; binLabels: string[]; min: number; avg: number; max: number };

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + (sizes[i] || 'Bytes');
}

function responseSizeMinMax(values: number[]): { min: number; max: number } {
    let min = Infinity, max = -Infinity;
    for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return { min, max };
}

function generateHistogram(data: number[], maxBinCount = 500): Histogram | null {
    const filtered = data.filter(v => v !== 0);
    if (filtered.length === 0) return null;

    const sorted = [...filtered].sort((a, b) => a - b);
    const lq = sorted[Math.floor(sorted.length * 0.1)];
    const uq = sorted[Math.floor(sorted.length * 0.95)];
    const quartileData = sorted.filter(v => v >= lq && v <= uq);
    if (quartileData.length === 0) return null;

    const { min: qMin, max: qMax } = responseSizeMinMax(quartileData);
    const roundedMin = Math.floor(qMin), roundedMax = Math.ceil(qMax);
    const range = roundedMax - roundedMin;

    let bins: number[], binLabels: string[];
    if (range <= maxBinCount) {
        bins = new Array(range + 1).fill(0);
        binLabels = [];
        for (let i = 0; i <= range; i++) binLabels.push(formatBytes(roundedMin + i));
        for (const v of quartileData) {
            const idx = Math.round(v) - roundedMin;
            if (idx >= 0 && idx < bins.length) bins[idx]++;
        }
    } else {
        const binWidth = range / maxBinCount;
        bins = new Array(maxBinCount).fill(0);
        binLabels = [];
        for (let i = 0; i < maxBinCount; i++) binLabels.push(formatBytes(roundedMin + i * binWidth));
        for (const v of quartileData) {
            if (v >= qMax) { bins[maxBinCount - 1]++; continue; }
            const idx = Math.min(Math.floor((v - roundedMin) / binWidth), maxBinCount - 1);
            if (idx >= 0) bins[idx]++;
        }
    }

    const { min, max } = responseSizeMinMax(filtered);
    const avg = filtered.reduce((s, v) => s + v, 0) / filtered.length;
    return { bins, binLabels, min, avg, max };
}

const ctx = self as unknown as Worker;

// ─── Internal state ───────────────────────────────────────────────────────────

let internalLogs: NginxLog[] = [];
let currentFilter: Filter | null = null;
let currentSettings: Settings | null = null;
let currentLocationMap = new Map<string, string>(); // ipAddress → country

// ─── Existing aggregates ──────────────────────────────────────────────────────

let aggEndpointCounts   = new Map<string, number>();
let aggReferrerCounts   = new Map<string, number>();
let aggResponseSizes:     number[] = [];
let aggVersionCounts:     Record<string, number> = {};
let aggClientCounts:      Record<string, number> = {};
let aggOsCounts:          Record<string, number> = {};
let aggDeviceTypeCounts:  Record<string, number> = {};
let aggDayCounts:         number[] = new Array(7).fill(0);
let aggHourCounts:        number[] = new Array(24).fill(0);
let aggLocationCounts:    Record<string, number> = {};
let aggUnknownIPs:        Set<string> = new Set();

// ─── Chart pre-computation ────────────────────────────────────────────────────
// All four chart components (Activity, SuccessRate, Requests, Users) previously
// ran independent O(n) loops on the main thread.  We now do a single combined
// pass here and send ready-to-render data, eliminating that main-thread cost.

// Bucket functions — pure integer arithmetic, no Date allocations.
type BucketFn = (ts: number) => number;
const getDayId    = (ts: number) => Math.floor(ts / 86400000) * 86400000;
const getHourId   = (ts: number) => Math.floor(ts / 3600000)  * 3600000;
const get6HourId  = (ts: number) => Math.floor(ts / 21600000) * 21600000;
const get5MinId   = (ts: number) => Math.floor(ts / 300000)   * 300000;
const getMinuteId = (ts: number) => Math.floor(ts / 60000)    * 60000;

// Current bucket configs — set on every filter change, fixed during appends.
let currentActivityBucketFn: BucketFn = getDayId;
let currentActivityStep = 86400000;
let currentTimeUnit: 'minute' | 'hour' | 'day' = 'day';
let currentTrendBucketFn: BucketFn = getDayId;   // 1h (24h) or 1d (all other periods)

// Activity-scale buckets (period-specific granularity: 5min / 1h / 6h / 1d)
let aggActivityReq   = new Map<number, number>();
let aggActivityUsers = new Map<number, Set<string>>();  // Sets kept here, only .size sent
let aggActivitySucc  = new Map<number, number>();
let aggActivityTotal = new Map<number, number>();

// Trend-scale buckets (1h for '1 hour'/'24 hours', 1d otherwise — for sparklines)
let aggTrendReq   = new Map<number, number>();
let aggTrendUsers = new Map<number, Set<string>>();
let aggTrendSucc  = new Map<number, number>();
let aggTrendTotal = new Map<number, number>();

// Scalar totals
let aggTotalRequests = 0;
let aggTotalUsersSet = new Set<string>();
let aggSuccessCount  = 0;
let aggSuccessTotal  = 0;
let aggMinTs: number | null = null;
let aggMaxTs: number | null = null;

// ─── Message types ────────────────────────────────────────────────────────────

type LogsMessage = {
    type: 'logs';
    logs: NginxLog[];
    filterVersion: number;
};

type FilterMessage = {
    type: 'filter';
    filter: Filter;
    settings: Settings;
    locationMap: [string, string][];
    filterVersion: number;
};

type LocationMapMessage = {
    type: 'locationMap';
    locationMap: [string, string][];
    filterVersion: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeSorted(a: NginxLog[], b: NginxLog[]): NginxLog[] {
    const result: NginxLog[] = new Array(a.length + b.length);
    let i = 0, j = 0, k = 0;
    while (i < a.length && j < b.length) {
        const ta = a[i].timestamp, tb = b[j].timestamp;
        if (ta === null || (tb !== null && ta <= tb)) result[k++] = a[i++];
        else result[k++] = b[j++];
    }
    while (i < a.length) result[k++] = a[i++];
    while (j < b.length) result[k++] = b[j++];
    return result;
}

function lowerBound(logs: NginxLog[], targetMs: number): number {
    let lo = 0, hi = logs.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        const t = logs[mid].timestamp;
        if (t !== null && t < targetMs) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

function passesFilter(
    row: NginxLog,
    filter: Filter,
    settings: Settings,
    locationMap: Map<string, string>,
    start: number | null,
): boolean {
    if (start !== null && (row.timestamp === null || row.timestamp < start)) return false;
    if (filter.location !== null && locationMap.get(row.ipAddress) !== filter.location) return false;
    if (filter.path !== null && row.path !== filter.path) return false;
    if (filter.method !== null && row.method !== filter.method) return false;
    if (settings.ignore404 && row.status === 404) return false;
    if (settings.excludeBots && row.isBot) return false;
    if (filter.referrer !== null && row.referrer !== filter.referrer) return false;
    if (filter.version !== null && getVersion(row.path) !== filter.version) return false;
    if (filter.client !== null && row.client !== filter.client) return false;
    if (filter.os !== null && row.os !== filter.os) return false;
    if (filter.deviceType !== null && row.device !== filter.deviceType) return false;

    if (filter.status !== null) {
        if (row.status === null) return false;
        if (typeof filter.status === 'number') {
            if (row.status !== filter.status) return false;
        } else {
            if (!filter.status.some(([lo, hi]) => row.status! >= lo && row.status! <= hi)) return false;
        }
    }

    const excludedEndpoints = settings.excludedEndpoints ?? [];
    if (excludedEndpoints.length > 0) {
        const rowPath = settings.ignoreParams ? row.path.split('?')[0] : row.path;
        if (excludedEndpoints.includes(rowPath)) return false;
    }

    if (filter.hour !== null && row.hour !== filter.hour) return false;
    if (filter.dayOfWeek !== null && row.dayOfWeek !== filter.dayOfWeek) return false;

    return true;
}

// ─── Bucket config ────────────────────────────────────────────────────────────

function updateBucketConfig(period: Period, rangeMs?: number) {
    switch (period) {
        case '1 hour':
            currentActivityBucketFn = getMinuteId; currentActivityStep = 60000;    currentTimeUnit = 'minute';
            currentTrendBucketFn    = getHourId;
            break;
        case '24 hours':
            currentActivityBucketFn = get5MinId;  currentActivityStep = 300000;   currentTimeUnit = 'minute';
            currentTrendBucketFn    = getHourId;
            break;
        case 'week':
            currentActivityBucketFn = getHourId;  currentActivityStep = 3600000;  currentTimeUnit = 'hour';
            currentTrendBucketFn    = getDayId;
            break;
        case 'month':
            currentActivityBucketFn = get6HourId; currentActivityStep = 21600000; currentTimeUnit = 'hour';
            currentTrendBucketFn    = getDayId;
            break;
        case '6 months':
            currentActivityBucketFn = getDayId;   currentActivityStep = 86400000; currentTimeUnit = 'day';
            currentTrendBucketFn    = getDayId;
            break;
        default: { // 'all time' — choose granularity based on data range
            const diff = rangeMs ?? 0;
            if (diff <= 86400000) {
                currentActivityBucketFn = get5MinId;  currentActivityStep = 300000;   currentTimeUnit = 'minute';
                currentTrendBucketFn    = getHourId;
            } else if (diff <= 604800000) {
                currentActivityBucketFn = getHourId;  currentActivityStep = 3600000;  currentTimeUnit = 'hour';
                currentTrendBucketFn    = getDayId;
            } else {
                currentActivityBucketFn = getDayId;   currentActivityStep = 86400000; currentTimeUnit = 'day';
                currentTrendBucketFn    = getDayId;
            }
        }
    }
}

function getPeriodLabels(period: Period, minTs: number | null, maxTs: number | null): { start: string; end: string } {
    switch (period) {
        case '1 hour':   return { start: 'One hour ago', end: 'Now' };
        case '24 hours': return { start: '24 hours ago', end: 'Now' };
        case 'week':     return { start: 'One week ago', end: 'Now' };
        case 'month':    return { start: 'One month ago', end: 'Now' };
        case '6 months': return { start: 'Six months ago', end: 'Now' };
        default:
            return (minTs !== null && maxTs !== null)
                ? { start: new Date(minTs).toLocaleDateString(), end: new Date(maxTs).toLocaleDateString() }
                : { start: '', end: '' };
    }
}

// ─── Accumulation ─────────────────────────────────────────────────────────────

function accumulateIntoAggregates(row: NginxLog) {
    // ── Existing aggregates ──
    const rowPath = currentSettings?.ignoreParams ? row.path.split('?')[0] : row.path;
    const key = `${rowPath}::${row.method}::${row.status ?? ''}`;
    aggEndpointCounts.set(key, (aggEndpointCounts.get(key) ?? 0) + 1);

    if (row.referrer && row.referrer !== '-') {
        aggReferrerCounts.set(row.referrer, (aggReferrerCounts.get(row.referrer) ?? 0) + 1);
    }
    if (row.responseSize) aggResponseSizes.push(row.responseSize);

    const v = getVersion(row.path);
    if (v) aggVersionCounts[v] = (aggVersionCounts[v] ?? 0) + 1;

    if (row.client) aggClientCounts[row.client] = (aggClientCounts[row.client] ?? 0) + 1;
    if (row.os)     aggOsCounts[row.os]          = (aggOsCounts[row.os]    ?? 0) + 1;
    if (row.device) aggDeviceTypeCounts[row.device] = (aggDeviceTypeCounts[row.device] ?? 0) + 1;

    if (row.dayOfWeek !== null) aggDayCounts[row.dayOfWeek]++;
    if (row.hour !== null)      aggHourCounts[row.hour]++;

    const country = currentLocationMap.get(row.ipAddress);
    if (country) aggLocationCounts[country] = (aggLocationCounts[country] ?? 0) + 1;
    else aggUnknownIPs.add(row.ipAddress);

    // ── Chart aggregates ──
    aggTotalRequests++;

    if (row.timestamp !== null) {
        const actKey   = currentActivityBucketFn(row.timestamp);
        const trendKey = currentTrendBucketFn(row.timestamp);

        // User identity — same scheme as getUserId() in lib/user.ts
        const userId = `${row.ipAddress}::${row.userAgent}`;

        // Activity-scale buckets
        aggActivityReq.set(actKey, (aggActivityReq.get(actKey) ?? 0) + 1);
        let aUsers = aggActivityUsers.get(actKey);
        if (!aUsers) { aUsers = new Set(); aggActivityUsers.set(actKey, aUsers); }
        aUsers.add(userId);

        // Trend-scale buckets
        aggTrendReq.set(trendKey, (aggTrendReq.get(trendKey) ?? 0) + 1);
        let tUsers = aggTrendUsers.get(trendKey);
        if (!tUsers) { tUsers = new Set(); aggTrendUsers.set(trendKey, tUsers); }
        tUsers.add(userId);

        // Success rates
        if (row.status !== null) {
            const isSuccess = row.status >= 200 && row.status <= 399;
            aggActivityTotal.set(actKey, (aggActivityTotal.get(actKey) ?? 0) + 1);
            aggTrendTotal.set(trendKey, (aggTrendTotal.get(trendKey) ?? 0) + 1);
            if (isSuccess) {
                aggActivitySucc.set(actKey, (aggActivitySucc.get(actKey) ?? 0) + 1);
                aggTrendSucc.set(trendKey, (aggTrendSucc.get(trendKey) ?? 0) + 1);
                aggSuccessCount++;
            }
            aggSuccessTotal++;
        }

        // Total unique users + range
        aggTotalUsersSet.add(userId);
        if (aggMinTs === null || row.timestamp < aggMinTs) aggMinTs = row.timestamp;
        if (aggMaxTs === null || row.timestamp > aggMaxTs) aggMaxTs = row.timestamp;
    }
}

// Pre-stamp every activity bucket slot across the visible time range with a zero
// entry so the strip of success-rate divs spans the full period even where there
// are no logs, matching the behaviour of the original per-render loop.
function prefillActivityBuckets() {
    const period = currentFilter?.period ?? 'all time';
    const periodStartMs = periodStart(period);
    const startMs = periodStartMs !== null ? periodStartMs : aggMinTs;
    if (startMs === null) return; // no data and no fixed start — nothing to fill
    const endMs = period === 'all time' ? (aggMaxTs ?? Date.now()) : Date.now();

    for (let t = currentActivityBucketFn(startMs); t <= currentActivityBucketFn(endMs); t += currentActivityStep) {
        if (!aggActivityReq.has(t))   aggActivityReq.set(t, 0);
        // aggActivityTotal must also have an entry so activityRateBuckets includes
        // this slot (value=null → rendered as a grey "no-data" div in the strip).
        if (!aggActivityTotal.has(t)) aggActivityTotal.set(t, 0);
    }
}

function recomputeAggregates(filteredData: NginxLog[]) {
    aggEndpointCounts  = new Map(); aggReferrerCounts = new Map();
    aggResponseSizes   = [];        aggVersionCounts  = {};
    aggClientCounts    = {};        aggOsCounts       = {};
    aggDeviceTypeCounts = {};       aggDayCounts      = new Array(7).fill(0);
    aggHourCounts       = new Array(24).fill(0);
    aggLocationCounts   = {};
    aggUnknownIPs       = new Set();

    aggActivityReq   = new Map(); aggActivityUsers = new Map();
    aggActivitySucc  = new Map(); aggActivityTotal = new Map();
    aggTrendReq      = new Map(); aggTrendUsers    = new Map();
    aggTrendSucc     = new Map(); aggTrendTotal    = new Map();
    aggTotalRequests = 0;         aggTotalUsersSet = new Set();
    aggSuccessCount  = 0;         aggSuccessTotal  = 0;
    aggMinTs         = null;      aggMaxTs         = null;

    for (const row of filteredData) accumulateIntoAggregates(row);
    prefillActivityBuckets();
}

// ─── Serialise aggregates ─────────────────────────────────────────────────────

function aggregates() {
    const period = currentFilter?.period ?? 'all time';

    // Sort once then map — avoids repeated lookups
    const activityBuckets = Array.from(aggActivityReq.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([ts, req]) => ({ ts, req, users: aggActivityUsers.get(ts)?.size ?? 0 }));

    const activityRateBuckets = Array.from(aggActivityTotal.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([ts, total]) => ({ ts, success: aggActivitySucc.get(ts) ?? 0, total }));

    const trendReqBuckets = Array.from(aggTrendReq.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, count]) => count);

    const trendUserBuckets = Array.from(aggTrendUsers.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, uSet]) => uSet.size);

    const trendRateBuckets = Array.from(aggTrendTotal.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([ts, total]) => ({ success: aggTrendSucc.get(ts) ?? 0, total }));

    const totalHours = aggMinTs !== null && aggMaxTs !== null
        ? Math.max((aggMaxTs - aggMinTs) / 3_600_000, 1)
        : (period !== 'all time'
            ? Math.max((Date.now() - (periodStart(period) ?? Date.now())) / 3_600_000, 1)
            : 1);

    return {
        // Existing aggregates
        endpointCounts: aggEndpointCounts,
        referrerCounts: aggReferrerCounts,
        histogram:      generateHistogram(aggResponseSizes),
        versionCounts:  aggVersionCounts,
        clientCounts:   aggClientCounts,
        osCounts:       aggOsCounts,
        deviceTypeCounts: aggDeviceTypeCounts,
        dayCounts:      aggDayCounts,
        hourCounts:     aggHourCounts,
        locationCounts: aggLocationCounts,
        unknownIPs:     Array.from(aggUnknownIPs),
        // Chart pre-computed data
        activityBuckets,
        activityRateBuckets,
        trendReqBuckets,
        trendUserBuckets,
        trendRateBuckets,
        timeUnit:        currentTimeUnit,
        step:            currentActivityStep,
        period,
        periodLabels:    getPeriodLabels(period, aggMinTs, aggMaxTs),
        totalRequests:   aggTotalRequests,
        totalUsers:      aggTotalUsersSet.size,
        totalHours,
        successCount:    aggSuccessCount,
        successTotal:    aggSuccessTotal,
    };
}

// ─── Recompute helper ─────────────────────────────────────────────────────────

function recomputeWithCurrentFilter(filterVersion: number) {
    if (!currentFilter || !currentSettings) return;

    const start = periodStart(currentFilter.period);
    const hasOtherFilters =
        currentFilter.location !== null || currentFilter.path !== null ||
        currentFilter.method !== null   || currentFilter.status !== null ||
        currentSettings.ignore404 || currentSettings.excludeBots ||
        currentSettings.ignoreParams || (currentSettings.excludedEndpoints ?? []).length > 0 ||
        currentFilter.referrer !== null || currentFilter.hour !== null ||
        currentFilter.dayOfWeek !== null || currentFilter.client !== null ||
        currentFilter.os !== null || currentFilter.deviceType !== null ||
        currentFilter.version !== null;

    // Determine data range for 'all time' bucket config before recompute
    let rangeMs: number | undefined;
    if (currentFilter.period === 'all time' && internalLogs.length > 0) {
        let minTs: number | null = null, maxTs: number | null = null;
        for (let i = 0; i < internalLogs.length; i++) {
            if (internalLogs[i].timestamp !== null) { minTs = internalLogs[i].timestamp!; break; }
        }
        for (let i = internalLogs.length - 1; i >= 0; i--) {
            if (internalLogs[i].timestamp !== null) { maxTs = internalLogs[i].timestamp!; break; }
        }
        if (minTs !== null && maxTs !== null) rangeMs = maxTs - minTs;
    }
    updateBucketConfig(currentFilter.period, rangeMs);

    let filteredData: NginxLog[];

    if (start === null && !hasOtherFilters) {
        filteredData = internalLogs;
    } else {
        const startIdx = start !== null ? lowerBound(internalLogs, start) : 0;
        if (!hasOtherFilters) {
            filteredData = startIdx === 0 ? internalLogs : internalLogs.slice(startIdx);
        } else {
            filteredData = [];
            for (let i = startIdx; i < internalLogs.length; i++) {
                if (passesFilter(internalLogs[i], currentFilter, currentSettings, currentLocationMap, null)) {
                    filteredData.push(internalLogs[i]);
                }
            }
        }
    }

    recomputeAggregates(filteredData);
    ctx.postMessage({ ...aggregates(), filterVersion });
}

// ─── Message handler ──────────────────────────────────────────────────────────

ctx.onmessage = (e: MessageEvent<LogsMessage | FilterMessage | LocationMapMessage>) => {
    const msg = e.data;

    if (msg.type === 'logs') {
        internalLogs = mergeSorted(internalLogs, msg.logs);

        const start = currentFilter ? periodStart(currentFilter.period) : null;

        for (const row of msg.logs) {
            if (!currentFilter || !currentSettings || passesFilter(row, currentFilter, currentSettings, currentLocationMap, start)) {
                accumulateIntoAggregates(row);
            }
        }

        ctx.postMessage({ ...aggregates(), filterVersion: msg.filterVersion });

    } else if (msg.type === 'locationMap') {
        currentLocationMap = new Map(msg.locationMap);
        recomputeWithCurrentFilter(msg.filterVersion);

    } else {
        currentFilter      = msg.filter;
        currentSettings    = msg.settings;
        currentLocationMap = new Map(msg.locationMap);
        recomputeWithCurrentFilter(msg.filterVersion);
    }
};
