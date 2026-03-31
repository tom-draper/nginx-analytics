'use client';

import Activity from "@/lib/components/activity";
import { Endpoints } from "@/lib/components/endpoints";
import { Logo } from "@/lib/components/logo";
import { Navigation } from "@/lib/components/navigation";
import { Requests } from "@/lib/components/requests";
import { SuccessRate } from "@/lib/components/success-rate";
import Users from "@/lib/components/users";
import { Version } from "@/lib/components/version";
import { Location } from "@/lib/components/location";
import { type Location as LocationType } from "@/lib/location"
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
import dynamic from "next/dynamic";

const NetworkBackground = dynamic(() => import("./network-background"), { ssr: false });
const FileUpload = dynamic(() => import("./file-upload"));

// Merge two timestamp-sorted NginxLog arrays into one sorted array (O(n)).
// Null timestamps sort to the end, matching parse.worker sort order.
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
    // logsRef holds all parsed logs sorted by timestamp.  We avoid storing them
    // in React state (saves reconciler overhead for a large array that components
    // don't directly render).  logVersion is a cheap counter that lets the
    // filteredData useMemo re-run when new logs arrive.
    const logVersion = useRef(0);
    const [logVersionState, setLogVersionState] = useState(0);

    const [errorLogs, setErrorLogs] = useState<string[]>([]);

    const [locationMap, setLocationMap] = useState<Map<string, LocationType>>(new Map());

    const [settings, setSettings] = useState<SettingsType>(newSettings());
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const [filter, setFilter] = useState<Filter>(newFilter());
    const [, startTransition] = useTransition();

    // filteredData returned by the worker for complex (non-period-only) filter states.
    const [workerFilteredData, setWorkerFilteredData] = useState<NginxLog[]>([]);

    // Whether any filter beyond the period cut is active.
    const hasOtherFilters = useMemo(() =>
        filter.location !== null || filter.path !== null ||
        filter.method !== null || filter.status !== null ||
        settings.ignore404 || settings.excludeBots ||
        settings.ignoreParams || (settings.excludedEndpoints ?? []).length > 0 ||
        filter.referrer !== null || filter.hour !== null ||
        filter.dayOfWeek !== null || filter.client !== null ||
        filter.os !== null || filter.deviceType !== null ||
        filter.version !== null,
        [filter, settings]
    );

    // Ref kept synchronously in step with hasOtherFilters so the async worker
    // onmessage handler can read it without stale-closure issues.
    const hasOtherFiltersRef = useRef(false);
    hasOtherFiltersRef.current = hasOtherFilters;

    // logsRef holds the master sorted log array. It is updated synchronously on
    // every parse batch so the filteredData useMemo and the aggregate worker always
    // see fresh data without waiting for a React state flush.
    const logsRef = useRef<NginxLog[]>([]);

    // For period-only changes filteredData is derived synchronously from the local
    // sorted logs copy via binary search + slice — no worker round-trip needed.
    // This means period switches update filteredData in the same render as the
    // period label, eliminating the "wrong proportions" intermediate frame.
    // Complex filters still delegate to the worker and use workerFilteredData.
    const filteredData = useMemo(() => {
        void logVersionState; // reactive dependency — actual data comes from logsRef
        if (hasOtherFilters) return workerFilteredData;
        const start = periodStart(filter.period);
        const logs = logsRef.current;
        if (!start) return logs;
        const idx = lowerBound(logs, start);
        return idx === 0 ? logs : logs.slice(idx);
    }, [hasOtherFilters, workerFilteredData, filter.period, logVersionState]);

    const [aggregates, setAggregates] = useState({
        endpointCounts:   new Map<string, number>(),
        referrerCounts:   new Map<string, number>(),
        responseSizes:    [] as number[],
        versionCounts:    {} as Record<string, number>,
        clientCounts:     {} as Record<string, number>,
        osCounts:         {} as Record<string, number>,
        deviceTypeCounts: {} as Record<string, number>,
        dayCounts:        new Array(7).fill(0) as number[],
        // Chart pre-computed by the aggregate worker — eliminates O(n) main-thread
        // iteration in Activity, SuccessRate, Requests, and Users.
        activityBuckets:     [] as Array<{ ts: number; req: number; users: number }>,
        activityRateBuckets: [] as Array<{ ts: number; success: number; total: number }>,
        trendReqBuckets:     [] as number[],
        trendUserBuckets:    [] as number[],
        trendRateBuckets:    [] as Array<{ success: number; total: number }>,
        timeUnit:            'day' as 'minute' | 'hour' | 'day',
        step:                86400000,
        periodLabels:        { start: '', end: '' } as { start: string; end: string },
        totalRequests:       0,
        totalUsers:          0,
        totalHours:          1,
        successCount:        0,
        successTotal:        0,
    });

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
    const batchIdRef = useRef(0);
    const workerRef = useRef<Worker | null>(null);
    const filterVersionRef = useRef(0);
    const aggregateWorkerRef = useRef<Worker | null>(null);
    // Throttle: schedule at most one logVersionState bump per animation frame so
    // that rapid initial-load batches don't each trigger a separate render cycle
    // for Location / UsageTime (the only two components still reading filteredData).
    const logUpdatePending = useRef(false);

    useEffect(() => {
        const worker = new Worker(new URL('../workers/parse.worker.ts', import.meta.url));
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent<{ parsed: NginxLog[]; batchId: number; isFirstBatch: boolean }>) => {
            const { parsed, batchId, isFirstBatch } = e.data;
            if (batchId !== batchIdRef.current || parsed.length === 0) return;

            if (isFirstBatch) {
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
            }

            // Merge sorted batch into logsRef synchronously (O(n) merge).
            logsRef.current = mergeSorted(logsRef.current, parsed);

            // Bump the version counter so the filteredData useMemo re-runs, but
            // coalesce rapid batches into a single rAF to avoid per-batch renders.
            if (!logUpdatePending.current) {
                logUpdatePending.current = true;
                requestAnimationFrame(() => {
                    logVersion.current++;
                    setLogVersionState(logVersion.current);
                    logUpdatePending.current = false;
                });
            }

            // Forward parsed batch to aggregate worker for incremental filter+aggregate
            aggregateWorkerRef.current?.postMessage({
                type: 'logs',
                logs: parsed,
                filterVersion: filterVersionRef.current,
            });
        };

        return () => worker.terminate();
    }, []);

    useEffect(() => {
        const worker = new Worker(new URL('../workers/aggregate.worker.ts', import.meta.url));
        aggregateWorkerRef.current = worker;

        worker.onmessage = (e: MessageEvent<{
            type: 'append' | 'replace' | 'aggregatesOnly';
            newFiltered?: NginxLog[];
            filteredData?: NginxLog[];
            // existing aggregates
            endpointCounts: Map<string, number>;
            referrerCounts: Map<string, number>;
            responseSizes: number[];
            versionCounts: Record<string, number>;
            clientCounts: Record<string, number>;
            osCounts: Record<string, number>;
            deviceTypeCounts: Record<string, number>;
            dayCounts: number[];
            // chart pre-computed data
            activityBuckets: Array<{ ts: number; req: number; users: number }>;
            activityRateBuckets: Array<{ ts: number; success: number; total: number }>;
            trendReqBuckets: number[];
            trendUserBuckets: number[];
            trendRateBuckets: Array<{ success: number; total: number }>;
            timeUnit: 'minute' | 'hour' | 'day';
            step: number;
            periodLabels: { start: string; end: string };
            totalRequests: number;
            totalUsers: number;
            totalHours: number;
            successCount: number;
            successTotal: number;
            filterVersion: number;
        }>) => {
            const { type, filterVersion } = e.data;
            if (filterVersion !== filterVersionRef.current) return;

            const {
                endpointCounts, referrerCounts, responseSizes, versionCounts,
                clientCounts, osCounts, deviceTypeCounts, dayCounts,
                activityBuckets, activityRateBuckets,
                trendReqBuckets, trendUserBuckets, trendRateBuckets,
                timeUnit, step, periodLabels,
                totalRequests, totalUsers, totalHours, successCount, successTotal,
            } = e.data;

            setAggregates({
                endpointCounts, referrerCounts, responseSizes, versionCounts,
                clientCounts, osCounts, deviceTypeCounts, dayCounts,
                activityBuckets, activityRateBuckets,
                trendReqBuckets, trendUserBuckets, trendRateBuckets,
                timeUnit, step, periodLabels,
                totalRequests, totalUsers, totalHours, successCount, successTotal,
            });

            if (type === 'append') {
                if (e.data.newFiltered && hasOtherFiltersRef.current) {
                    setWorkerFilteredData(prev => mergeSorted(prev, e.data.newFiltered!));
                }
            } else if (type === 'replace' && e.data.filteredData) {
                setWorkerFilteredData(e.data.filteredData);
            }
            // 'aggregatesOnly': filteredData derived from logsRef via useMemo.
        };

        return () => worker.terminate();
    }, []);

    useEffect(() => {
        if (accessLogs.length <= parsedAccessCount.current || !workerRef.current) return;

        const newRawLogs = accessLogs.slice(parsedAccessCount.current);
        const isFirstBatch = parsedAccessCount.current === 0;
        parsedAccessCount.current = accessLogs.length;

        batchIdRef.current++;
        workerRef.current.postMessage({ logs: newRawLogs, logFormat, batchId: batchIdRef.current, isFirstBatch });
    }, [accessLogs]);

    // Send filter/settings/locationMap to the aggregate worker whenever any of them change.
    // The worker re-runs a full filter+aggregate and returns a 'replace' response.
    // locationMap entries are sent as [ipAddress, country] pairs; empty when location
    // filter is inactive (the worker skips the lookup in that case too).
    useEffect(() => {
        if (!aggregateWorkerRef.current) return;
        filterVersionRef.current++;
        const locationEntries: [string, string][] = filter.location !== null
            ? [...locationMap.entries()].map(([ip, loc]) => [ip, loc.country])
            : [];
        aggregateWorkerRef.current.postMessage({
            type: 'filter',
            filter,
            settings,
            locationMap: locationEntries,
            filterVersion: filterVersionRef.current,
        });
    }, [filter, settings, locationMap]);

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

    // filteredData is now a derived value (useMemo) so period-only changes update it
    // synchronously in the same render.  useDeferredValue still helps for complex filter
    // changes where large workerFilteredData payloads arrive asynchronously.
    const deferredFilteredData = useDeferredValue(filteredData);

    const {
        endpointCounts, referrerCounts, responseSizes, versionCounts,
        clientCounts, osCounts, deviceTypeCounts, dayCounts,
        activityBuckets, activityRateBuckets,
        trendReqBuckets, trendUserBuckets, trendRateBuckets,
        timeUnit, step, periodLabels,
        totalRequests, totalUsers, totalHours, successCount, successTotal,
    } = aggregates;

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
                <Settings settings={settings} setSettings={setSettings} showSettings={showSettings} setShowSettings={setShowSettings} filter={filter} exportCSV={() => { exportCSV(logsRef.current) }} />

                <Navigation filterPeriod={filter.period} setFilterPeriod={setPeriod} setShowSettings={setShowSettings} isDemo={demo} />

                <div className="flex max-[950px]:flex-col">
                    {/* Left */}
                    <div className="min-[950px]:w-[27em]">
                        <div className="flex">
                            <Logo />
                            <SuccessRate successCount={successCount} successTotal={successTotal} trendRateBuckets={trendRateBuckets} />
                        </div>

                        <div className="flex">
                            <Requests totalRequests={totalRequests} totalHours={totalHours} trendReqBuckets={trendReqBuckets} />
                            <Users totalUsers={totalUsers} totalHours={totalHours} trendUserBuckets={trendUserBuckets} />
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
                        <Activity
                            activityBuckets={activityBuckets}
                            activityRateBuckets={activityRateBuckets}
                            timeUnit={timeUnit}
                            step={step}
                            periodLabels={periodLabels}
                            period={filter.period}
                        />

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
                                <UsageTime data={deferredFilteredData} filterHour={filter.hour} setFilterHour={setHour} />
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
