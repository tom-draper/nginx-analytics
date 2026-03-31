import { NginxLog } from '../types';
import { Filter } from '../filter';
import { Settings } from '../settings';
import { periodStart } from '../period';
import { getVersion } from '../get-version';

const ctx = self as unknown as Worker;

// ─── Internal state ───────────────────────────────────────────────────────────

let internalLogs: NginxLog[] = [];
let currentFilter: Filter | null = null;
let currentSettings: Settings | null = null;
let currentLocationMap = new Map<string, string>(); // ipAddress → country

// Aggregate counts maintained incrementally across log-append messages.
// A filter change resets and recomputes these from scratch.
let aggEndpointCounts = new Map<string, number>();
let aggReferrerCounts = new Map<string, number>();
let aggResponseSizes: number[] = [];
let aggVersionCounts: Record<string, number> = {};
let aggClientCounts: Record<string, number> = {};
let aggOsCounts: Record<string, number> = {};
let aggDeviceTypeCounts: Record<string, number> = {};
let aggDayCounts: number[] = new Array(7).fill(0);

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

    if (filter.hour !== null || filter.dayOfWeek !== null) {
        if (row.timestamp === null) return false;
        const d = new Date(row.timestamp);
        if (filter.hour !== null && d.getHours() !== filter.hour) return false;
        if (filter.dayOfWeek !== null && d.getDay() !== filter.dayOfWeek) return false;
    }

    return true;
}

function accumulateIntoAggregates(row: NginxLog) {
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
    if (row.os) aggOsCounts[row.os] = (aggOsCounts[row.os] ?? 0) + 1;
    if (row.device) aggDeviceTypeCounts[row.device] = (aggDeviceTypeCounts[row.device] ?? 0) + 1;

    if (row.timestamp !== null) aggDayCounts[new Date(row.timestamp).getDay()]++;
}

function recomputeAggregates(filteredData: NginxLog[]) {
    aggEndpointCounts = new Map();
    aggReferrerCounts = new Map();
    aggResponseSizes = [];
    aggVersionCounts = {};
    aggClientCounts = {};
    aggOsCounts = {};
    aggDeviceTypeCounts = {};
    aggDayCounts = new Array(7).fill(0);
    for (const row of filteredData) accumulateIntoAggregates(row);
}

function aggregates() {
    return {
        endpointCounts: aggEndpointCounts,
        referrerCounts: aggReferrerCounts,
        responseSizes: aggResponseSizes,
        versionCounts: aggVersionCounts,
        clientCounts: aggClientCounts,
        osCounts: aggOsCounts,
        deviceTypeCounts: aggDeviceTypeCounts,
        dayCounts: aggDayCounts,
    };
}

// ─── Message handler ──────────────────────────────────────────────────────────

ctx.onmessage = (e: MessageEvent<LogsMessage | FilterMessage>) => {
    const msg = e.data;

    if (msg.type === 'logs') {
        // Merge the new sorted batch into internal logs
        internalLogs = mergeSorted(internalLogs, msg.logs);

        // Filter only the new batch incrementally — the existing aggregate
        // counts already reflect all previously accepted logs.
        const start = currentFilter ? periodStart(currentFilter.period) : null;
        const newFiltered: NginxLog[] = [];

        for (const row of msg.logs) {
            if (!currentFilter || !currentSettings || passesFilter(row, currentFilter, currentSettings, currentLocationMap, start)) {
                newFiltered.push(row);
                accumulateIntoAggregates(row);
            }
        }

        ctx.postMessage({ type: 'append', newFiltered, ...aggregates(), filterVersion: msg.filterVersion });

    } else {
        // Filter or settings changed — update state and do a full recompute
        currentFilter = msg.filter;
        currentSettings = msg.settings;
        currentLocationMap = new Map(msg.locationMap);

        const start = periodStart(currentFilter.period);
        const hasOtherFilters =
            currentFilter.location !== null || currentFilter.path !== null ||
            currentFilter.method !== null || currentFilter.status !== null ||
            currentSettings.ignore404 || currentSettings.excludeBots ||
            currentSettings.ignoreParams || (currentSettings.excludedEndpoints ?? []).length > 0 ||
            currentFilter.referrer !== null || currentFilter.hour !== null ||
            currentFilter.dayOfWeek !== null || currentFilter.client !== null ||
            currentFilter.os !== null || currentFilter.deviceType !== null ||
            currentFilter.version !== null;

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

        // When no field-level filters are active (period-only), the main thread
        // derives filteredData synchronously from its own logs copy via useMemo,
        // so we only need to return the aggregates.
        if (!hasOtherFilters) {
            ctx.postMessage({ type: 'aggregatesOnly', ...aggregates(), filterVersion: msg.filterVersion });
        } else {
            ctx.postMessage({ type: 'replace', filteredData, ...aggregates(), filterVersion: msg.filterVersion });
        }
    }
};
