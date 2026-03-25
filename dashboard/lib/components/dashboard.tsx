'use client';

import Activity from "@/lib/components/activity";
import { Endpoints } from "@/lib/components/endpoints";
import { Logo } from "@/lib/components/logo";
import { Navigation } from "@/lib/components/navigation";
import { Requests } from "@/lib/components/requests";
import { SuccessRate } from "@/lib/components/success-rate";
import Users from "@/lib/components/users";
import { Version, getVersion } from "@/lib/components/version";
import { Location } from "@/lib/components/location";
import { type Location as LocationType } from "@/lib/location"
import { parseNginxLogs } from "@/lib/parse";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Device } from "@/lib/components/device/device";
import { type Filter, newFilter } from "@/lib/filter";
import { Period, periodStart } from "@/lib/period";
import UsageTime from "@/lib/components/usage-time";
import UsageDay from "@/lib/components/usage-day";
import { Referrals } from "@/lib/components/referrals";
import { ResponseSize } from "@/lib/components/response-size";
import { SystemResources } from "@/lib/components/system/system-resources";
import { generateNginxLogs } from "@/lib/demo";
import { NginxLog } from "@/lib/types";
import Errors from "@/lib/components/errors";
import LiveGlobeCard from "@/lib/components/live-globe-card";
import { Settings } from "@/lib/components/settings";
import { type Settings as SettingsType, newSettings } from "@/lib/settings";
import { exportCSV } from "@/lib/export";
import { getClient, getOS, getDevice } from "@/lib/get-device-info";
import { isBotOrCrawler } from "@/lib/user-agent";
import dynamic from "next/dynamic";

const NetworkBackground = dynamic(() => import("./network-background"), { ssr: false });
const FileUpload = dynamic(() => import("./file-upload"));

const EMPTY_MAP = new Map<string, LocationType>();
const PARSE_CHUNK_SIZE = 5000;

// Comparator: sort NginxLog entries ascending by timestamp (nulls sort to the end)
const compareByTimestamp = (a: NginxLog, b: NginxLog): number => {
    if (a.timestamp === null) return 1;
    if (b.timestamp === null) return -1;
    return a.timestamp - b.timestamp; // both numbers
};

// Binary search: returns the first index in (sorted) logs whose timestamp >= targetMs.
// Logs with null timestamps are sorted to the END of the array (compareByTimestamp puts
// nulls last), so a null at mid means the answer lies before mid — set hi = mid.
function lowerBound(logs: NginxLog[], targetMs: number): number {
    let lo = 0, hi = logs.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        const t = logs[mid].timestamp;
        if (t !== null && t < targetMs) {
            lo = mid + 1;
        } else {
            // t === null (null zone at end) or t >= targetMs: answer is at or before mid
            hi = mid;
        }
    }
    return lo;
}

function getUrl(positions: { filename: string; position: number }[] | null, includeCompressed: boolean) {
    let url = `/api/logs/access?includeCompressed=${includeCompressed}`;
    if (positions) {
        url += `&positions=${encodeURIComponent(JSON.stringify(positions))}`;
    }
    return url;
}

function inPeriod(date: number, period: Period) {
    const start = periodStart(period);
    if (!start) return true;
    return date >= start;
}

export default function Dashboard({ fileUpload, demo, logFormat }: { fileUpload: boolean, demo: boolean, logFormat?: string }) {
    const [accessLogs, setAccessLogs] = useState<string[]>([]);
    const [logs, setLogs] = useState<NginxLog[]>([]);

    const [errorLogs, setErrorLogs] = useState<string[]>([]);

    const [locationMap, setLocationMap] = useState<Map<string, LocationType>>(new Map());

    const [settings, setSettings] = useState<SettingsType>(newSettings());
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const [filter, setFilter] = useState<Filter>(newFilter());
    const [, startTransition] = useTransition();

    const setPeriod = useCallback((period: Period) => {
        startTransition(() => setFilter((previous) => ({ ...previous, period })))
    }, [])

    const setLocation = useCallback((location: string | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, location })))
    }, [])

    const setEndpoint = useCallback((path: string | null, method: string | null, status: number | [number, number][] | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, path, method, status })))
    }, [])

    const setStatus = useCallback((status: number | [number, number][] | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, status })))
    }, [])

    const setReferrer = useCallback((referrer: string | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, referrer })))
    }, [])

    const setVersion = useCallback((version: string | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, version })))
    }, [])

    const setClient = useCallback((client: string | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, client })))
    }, [])

    const setOS = useCallback((os: string | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, os })))
    }, [])

    const setDeviceType = useCallback((deviceType: string | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, deviceType })))
    }, [])

    const setHour = useCallback((hour: number | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, hour })))
    }, [])

    const setDayOfWeek = useCallback((dayOfWeek: number | null) => {
        startTransition(() => setFilter((previous) => ({ ...previous, dayOfWeek })))
    }, [])

    const parsedAccessCount = useRef(0);
    const parseCancelRef = useRef(false);

    useEffect(() => {
        if (accessLogs.length <= parsedAccessCount.current) return;

        const newRawLogs = accessLogs.slice(parsedAccessCount.current);
        const isFirstBatch = parsedAccessCount.current === 0;
        parsedAccessCount.current = accessLogs.length;

        const initPeriod = (parsed: ReturnType<typeof parseNginxLogs>) => {
            let maxDate = parsed[0].timestamp;
            for (const log of parsed) {
                if (log.timestamp !== null && (maxDate === null || log.timestamp > maxDate)) {
                    maxDate = log.timestamp;
                }
            }
            if (maxDate) {
                if (inPeriod(maxDate, 'week')) setPeriod('week');
                else if (inPeriod(maxDate, 'month')) setPeriod('month');
                else if (inPeriod(maxDate, '6 months')) setPeriod('6 months');
                else setPeriod('all time');
            }
        };

        // Small batches: parse synchronously
        if (newRawLogs.length <= PARSE_CHUNK_SIZE) {
            const newParsed = parseNginxLogs(newRawLogs, logFormat);
            if (newParsed.length === 0) return;
            if (isFirstBatch) initPeriod(newParsed);
            setLogs(prev => [...prev, ...newParsed].sort(compareByTimestamp));
            return;
        }

        // Large batches: chunk with setTimeout to avoid blocking the main thread,
        // but accumulate all results and update state only once at the end.
        parseCancelRef.current = false;
        let offset = 0;
        const allParsed: ReturnType<typeof parseNginxLogs> = [];
        const processChunk = () => {
            if (parseCancelRef.current) return;
            const chunk = newRawLogs.slice(offset, offset + PARSE_CHUNK_SIZE);
            if (chunk.length === 0) return;
            const parsed = parseNginxLogs(chunk, logFormat);
            if (parsed.length > 0) allParsed.push(...parsed);
            offset += PARSE_CHUNK_SIZE;
            if (offset < newRawLogs.length) {
                setTimeout(processChunk, 0);
            } else {
                // All chunks done — single state update
                if (allParsed.length > 0) {
                    if (isFirstBatch) initPeriod(allParsed);
                    setLogs(prev => [...prev, ...allParsed].sort(compareByTimestamp));
                }
            }
        };
        processChunk();

        return () => { parseCancelRef.current = true; };
    }, [accessLogs])

    useEffect(() => {
        if (fileUpload) {
            return;
        }

        if (demo) {
            const endDate = new Date();
            const startDate = new Date(endDate);
            startDate.setFullYear(startDate.getFullYear() - 1);
            setAccessLogs(generateNginxLogs({ format: 'extended', count: 120000, startDate, endDate }));

            // Simulate real-time polling: append a small batch of fresh logs every 30s,
            // matching the same interval used by the live dashboard.
            const interval = setInterval(() => {
                const pollEnd = new Date();
                const pollStart = new Date(pollEnd.getTime() - 30000);
                const count = Math.floor(Math.random() * 16) + 5; // 5–20 requests per poll
                const newLogs = generateNginxLogs({ format: 'extended', count, startDate: pollStart, endDate: pollEnd });
                setAccessLogs(prev => [...prev, ...newLogs]);
            }, 30000);

            return () => clearInterval(interval);
        }

        // Store positions in a closure variable within the effect
        let positions: Array<{ filename: string, position: number }> | null = null;
        let includeCompressed = true

        const fetchLogs = async () => {
            try {
                const url = getUrl(positions, includeCompressed);
                const response = await fetch(url);
                if (!response.ok) {
                    if (interval && (response.status === 403 || response.status === 404)) {
                        clearInterval(interval);
                        return;
                    }
                    throw new Error("Failed to fetch logs");
                }

                const data = await response.json();

                if (data.logs && data.logs.length > 0) {
                    setAccessLogs((prevLogs) => [...prevLogs, ...data.logs]);

                    if (data.positions) {
                        positions = data.positions;
                    }
                    includeCompressed = false;
                }

                if (data.complete) {
                    clearInterval(interval);
                }
            } catch (error) {
                console.error("Error fetching logs:", error);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [demo, fileUpload]);

    // Only track locationMap when a location filter is active — avoids recomputing
    // filteredData on every IP-resolution batch when no location filter is set.
    const effectiveLocationMap = filter.location !== null ? locationMap : EMPTY_MAP;

    const filteredData = useMemo(() => {
        const hasOtherFilters =
            filter.location !== null
            || filter.path !== null
            || filter.method !== null
            || filter.status !== null
            || settings.ignore404
            || settings.excludeBots
            || settings.ignoreParams
            || (settings.excludedEndpoints ?? []).length > 0
            || filter.referrer !== null
            || filter.hour !== null
            || filter.dayOfWeek !== null
            || filter.client !== null
            || filter.os !== null
            || filter.deviceType !== null
            || filter.version !== null;

        const start = periodStart(filter.period);

        // Fast path: "all time" with no other active filters — return logs directly
        if (start === null && !hasOtherFilters) {
            return logs;
        }

        // Binary search to skip logs that are before the period start
        const startIdx = start !== null ? lowerBound(logs, start) : 0;

        // Fast path: period-only filter with nothing else — return the slice directly
        if (!hasOtherFilters) {
            return startIdx === 0 ? logs : logs.slice(startIdx);
        }

        const validStatus = (status: number | null) => {
            if (status === null || filter.status === null) {
                return true;
            }
            if (typeof filter.status === 'number') {
                return status === filter.status;
            }
            for (const range of filter.status) {
                if (range[0] <= status && range[1] >= status) {
                    return true;
                }
            }
            return false;
        };

        const excludedEndpoints = settings.excludedEndpoints ?? [];

        const needsDate = filter.hour !== null || filter.dayOfWeek !== null;
        const needsDeviceInfo = filter.client !== null || filter.os !== null || filter.deviceType !== null;

        const result: NginxLog[] = [];
        for (let i = startIdx; i < logs.length; i++) {
            const row = logs[i];
            const rowPath = settings.ignoreParams ? row.path.split('?')[0] : row.path;
            const d = needsDate && row.timestamp !== null ? new Date(row.timestamp) : null;
            if (
                (filter.location === null || effectiveLocationMap.get(row.ipAddress)?.country === filter.location)
                && (filter.path === null || row.path === filter.path)
                && (filter.method === null || row.method === filter.method)
                && (filter.status === null || validStatus(row.status))
                && (!settings.ignore404 || row.status !== 404)
                && (!settings.excludeBots || !isBotOrCrawler(row.userAgent))
                && (excludedEndpoints.length === 0 || !excludedEndpoints.includes(rowPath))
                && (filter.referrer === null || row.referrer === filter.referrer)
                && (filter.hour === null || (d !== null && d.getHours() === filter.hour))
                && (filter.dayOfWeek === null || (d !== null && d.getDay() === filter.dayOfWeek))
                && (filter.version === null || getVersion(row.path) === filter.version)
                && (!needsDeviceInfo || (
                    (filter.client === null || getClient(row.userAgent) === filter.client)
                    && (filter.os === null || getOS(row.userAgent) === filter.os)
                    && (filter.deviceType === null || getDevice(row.userAgent) === filter.deviceType)
                ))
            ) {
                result.push(row);
            }
        }
        return result;
    }, [logs, filter, settings, effectiveLocationMap]);

    // Defer heavy re-renders when filteredData changes (e.g. switching to "All time").
    // Components receive the previous dataset while React computes the new one in the
    // background, keeping the UI responsive instead of freezing for seconds.
    const deferredFilteredData = useDeferredValue(filteredData);

    // Single pass over deferredFilteredData to compute all derived values
    const { endpointCounts, referrerCounts, responseSizes, versionCounts, clientCounts, osCounts, deviceTypeCounts, dayCounts } = useMemo(() => {
        const endpointCounts = new Map<string, number>();
        const referrerCounts = new Map<string, number>();
        const responseSizes: number[] = [];
        const versionCounts: Record<string, number> = {};
        const clientCounts: Record<string, number> = {};
        const osCounts: Record<string, number> = {};
        const deviceTypeCounts: Record<string, number> = {};
        const dayCounts = new Array(7).fill(0);

        for (const row of deferredFilteredData) {
            const key = `${row.path}::${row.method}::${row.status ?? ''}`;
            endpointCounts.set(key, (endpointCounts.get(key) ?? 0) + 1);

            if (row.referrer && row.referrer !== '-') {
                referrerCounts.set(row.referrer, (referrerCounts.get(row.referrer) ?? 0) + 1);
            }

            if (row.responseSize) responseSizes.push(row.responseSize);

            const v = getVersion(row.path);
            if (v) versionCounts[v] = (versionCounts[v] ?? 0) + 1;

            const c = getClient(row.userAgent);
            const o = getOS(row.userAgent);
            const d = getDevice(row.userAgent);
            if (c) clientCounts[c] = (clientCounts[c] ?? 0) + 1;
            if (o) osCounts[o] = (osCounts[o] ?? 0) + 1;
            if (d) deviceTypeCounts[d] = (deviceTypeCounts[d] ?? 0) + 1;

            if (row.timestamp !== null) dayCounts[new Date(row.timestamp).getDay()]++;
        }

        return { endpointCounts, referrerCounts, responseSizes, versionCounts, clientCounts, osCounts, deviceTypeCounts, dayCounts };
    }, [deferredFilteredData]);

    if (fileUpload && accessLogs.length === 0) {
        return (
            <div className="relative w-full h-screen bg-[var(--background)]">
                <NetworkBackground />
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none text-[#99a1af]">
                    <FileUpload setAccessLogs={setAccessLogs} setErrorLogs={setErrorLogs} />

                    <div className="max-w-md bg-y-80 backdrop-blur-sm border border-[var(--border-color)] rounded shadow-lg overflow-hidden mt-[6vh] w-fit">
                        <a
                            href="https://github.com/tom-draper/nginx-analytics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group pointer-events-auto flex items-center px-[2rem] py-[1rem] cursor-pointer"
                        >
                            <p className="transition-colors duration-300 group-hover:text-[var(--text)]">
                                Get started with self-hosting
                            </p>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-6 h-[20px] ml-[10px] transition-all duration-300 ease-in-out group-hover:translate-x-[3px] group-hover:stroke-[var(--highlight)] group-hover:delay-500"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
                            </svg>
                        </a>
                    </div>

                    <div className="absolute w-full bottom-6 text-center z-20 pointer-events-auto font-normal text-sm">
                        <a href="/dashboard/demo" target="_blank" className="text-[var(--text-muted3)] hover:text-[var(--text)] cursor-pointer transition-colors duration-100 ease-in-out">Try the demo</a>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <main className="sm:p-12 !pt-7">
                <Settings settings={settings} setSettings={setSettings} showSettings={showSettings} setShowSettings={setShowSettings} filter={filter} exportCSV={() => { exportCSV(logs) }} />

                <Navigation filterPeriod={filter.period} setFilterPeriod={setPeriod} setShowSettings={setShowSettings} isDemo={demo} />

                <div className="flex max-[950px]:flex-col">
                    {/* Left */}
                    <div className="min-[950px]:w-[27em]">
                        <div className="flex">
                            <Logo />
                            <SuccessRate data={deferredFilteredData} period={filter.period} />
                        </div>

                        <div className="flex">
                            <Requests data={deferredFilteredData} period={filter.period} />
                            <Users data={deferredFilteredData} period={filter.period} />
                        </div>

                        <div className="flex">
                            <Endpoints endpointCounts={endpointCounts} filterPath={filter.path} filterMethod={filter.method} filterStatus={filter.status} setEndpoint={setEndpoint} setStatus={setStatus} />
                        </div>

                        <div className="flex">
                            <ResponseSize responseSizes={responseSizes} />
                        </div>

                        <div className="flex">
                            <Version versionCounts={versionCounts} filterVersion={filter.version} setFilterVersion={setVersion} />
                        </div>
                    </div>

                    {/* Right */}
                    <div className="min-[950px]:flex-1 min-w-0">
                        <Activity data={deferredFilteredData} period={filter.period} />

                        <div className="flex max-[1500px]:flex-col">
                            <Location data={deferredFilteredData} locationMap={locationMap} setLocationMap={setLocationMap} filterLocation={filter.location} setFilterLocation={setLocation} noFetch={fileUpload} demo={demo} />
                            <div className="min-[1500px]:w-[27em]">
                                <Device
                                    clientCounts={clientCounts}
                                    osCounts={osCounts}
                                    deviceTypeCounts={deviceTypeCounts}
                                    filterClient={filter.client}
                                    setFilterClient={setClient}
                                    filterOS={filter.os}
                                    setFilterOS={setOS}
                                    filterDeviceType={filter.deviceType}
                                    setFilterDeviceType={setDeviceType}
                                />
                            </div>
                        </div>

                        <SystemResources demo={demo} />

                        <div className="w-inherit flex max-[1500px]:flex-col">
                            <div className="max-[1500px]:!w-full flex-1 min-w-0 flex flex-col">
                                <UsageTime data={deferredFilteredData} />
                                <UsageDay dayCounts={dayCounts} filterDayOfWeek={filter.dayOfWeek} setFilterDayOfWeek={setDayOfWeek} />
                                <Errors errorLogs={errorLogs} setErrorLogs={setErrorLogs} period={filter.period} noFetch={fileUpload} demo={demo} />
                                {/* <LiveGlobeCard logs={logs} locationMap={locationMap} /> */}
                            </div>
                            <div className="self-start order-first min-[1500px]:order-last max-[1500px]:w-full">
                                <Referrals referrerCounts={referrerCounts} filterReferrer={filter.referrer} setFilterReferrer={setReferrer} />
                            </div>
                        </div>

                    </div>
                </div>
            </main>
            <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">

            </footer>
        </div>
    );
}
