/// <reference lib="webworker" />
export type {};

import type { NginxLog } from './types';
import type { Filter } from './filter';
import type { Settings } from './settings';
import { isBotOrCrawler } from './user-agent';
import { periodStart } from './period';
import { getVersion } from './get-version';
import { getClient, getOS, getDevice } from './get-device-info';

type ComputeMessage = {
    type: 'compute';
    seq: number;
    filter: Filter;
    settings: Settings;
    locationMap: [string, string][]; // [ipAddress, country]
};

type SetLogsMessage = {
    type: 'setLogs';
    logs: NginxLog[];
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
};

let logs: NginxLog[] = [];
let logsWithoutBots: NginxLog[] = [];

self.onmessage = (e: MessageEvent<ComputeMessage | SetLogsMessage>) => {
    const { data } = e;

    if (data.type === 'setLogs') {
        logs = data.logs;
        logsWithoutBots = logs.filter(row => !isBotOrCrawler(row.userAgent));
        return;
    }

    const { seq, filter, settings, locationMap: locationMapEntries } = data;
    const locationMap = new Map(locationMapEntries);

    // Base filter
    const source = settings.excludeBots ? logsWithoutBots : logs;
    const start = periodStart(filter.period);
    const filteredData: NginxLog[] = [];

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
            filteredData.push(row);
        }
    }

    // Version filter
    const versionFilteredData = filter.version === null
        ? filteredData
        : filteredData.filter(row => getVersion(row.path) === filter.version);

    // Device filter
    let deviceFilteredData = versionFilteredData;
    if (filter.client !== null) deviceFilteredData = deviceFilteredData.filter(row => getClient(row.userAgent) === filter.client);
    if (filter.os !== null) deviceFilteredData = deviceFilteredData.filter(row => getOS(row.userAgent) === filter.os);
    if (filter.deviceType !== null) deviceFilteredData = deviceFilteredData.filter(row => getDevice(row.userAgent) === filter.deviceType);

    // Hour filter
    const hourFilteredData = filter.hour === null
        ? deviceFilteredData
        : deviceFilteredData.filter(row => row.timestamp?.getHours() === filter.hour);

    // Day filter
    const dayFilteredData = filter.dayOfWeek === null
        ? hourFilteredData
        : hourFilteredData.filter(row => row.timestamp?.getDay() === filter.dayOfWeek);

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
    };

    self.postMessage(result);
};
