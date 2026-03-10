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
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { WorkerResult } from '@/lib/analytics.worker';
import type { ParseWorkerResult } from '@/lib/parse.worker';
import { Device } from "@/lib/components/device/device";
import { type Filter, newFilter } from "@/lib/filter";
import { Period, periodStart } from "@/lib/period";
import UsageTime from "@/lib/components/usage-time";
import UsageDay from "@/lib/components/usage-day";
import { Referrals } from "@/lib/components/referrals";
import { ResponseSize } from "@/lib/components/response-size";
import { SystemResources } from "@/lib/components/system-resources";
import { generateNginxLogs } from "@/lib/demo";
import { NginxLog } from "@/lib/types";
import Errors from "@/lib/components/errors";
import { Settings } from "@/lib/components/settings";
import { type Settings as SettingsType, newSettings } from "@/lib/settings";
import { exportCSV } from "@/lib/export";
import dynamic from "next/dynamic";

const NetworkBackground = dynamic(() => import("./network-background"), { ssr: false });
const FileUpload = dynamic(() => import("./file-upload"));

export default function Dashboard({ fileUpload, demo, logFormat }: { fileUpload: boolean, demo: boolean, logFormat?: string }) {
    const [accessLogs, setAccessLogs] = useState<string[]>([]);
    const [logs, setLogs] = useState<NginxLog[]>([]);

    const [errorLogs, setErrorLogs] = useState<string[]>([]);

    const [locationMap, setLocationMap] = useState<Map<string, LocationType>>(new Map());

    const [settings, setSettings] = useState<SettingsType>(newSettings());
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const [filter, setFilter] = useState<Filter>(newFilter());
    const [, startTransition] = useTransition();

    const currentPeriod = useMemo(() => filter.period, [filter.period]);

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

    // Worker refs and result state
    const workerRef = useRef<Worker | null>(null);
    const workerSeqRef = useRef(0);
    const workerRawCountRef = useRef(0);
    const computeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const parseWorkerRef = useRef<Worker | null>(null);
    const [workerResult, setWorkerResult] = useState<WorkerResult | null>(null);

    // Create workers once on mount
    useEffect(() => {
        const worker = new Worker(new URL('../analytics.worker.ts', import.meta.url));
        workerRef.current = worker;
        worker.onmessage = (e: MessageEvent<WorkerResult>) => {
            if (e.data.seq === workerSeqRef.current) {
                setWorkerResult(e.data);
            }
        };

        const parseWorker = new Worker(new URL('../parse.worker.ts', import.meta.url));
        parseWorkerRef.current = parseWorker;
        parseWorker.onmessage = (e: MessageEvent<ParseWorkerResult>) => {
            const { logs: newLogs, maxTimestamp, isFirstBatch } = e.data;
            if (newLogs.length === 0) return;
            if (isFirstBatch && maxTimestamp !== null) {
                const maxDate = new Date(maxTimestamp);
                if (inPeriod(maxDate, 'week')) setPeriod('week');
                else if (inPeriod(maxDate, 'month')) setPeriod('month');
                else if (inPeriod(maxDate, '6 months')) setPeriod('6 months');
                else setPeriod('all time');
            }
            setLogs(prev => [...prev, ...newLogs]);
        };

        return () => {
            worker.terminate();
            parseWorker.terminate();
        };
    }, []);

    // Send raw logs to both workers for parsing (fires before compute effect)
    useEffect(() => {
        if (accessLogs.length <= workerRawCountRef.current) return;
        const newRawLogs = accessLogs.slice(workerRawCountRef.current);
        const isFirstBatch = workerRawCountRef.current === 0;
        workerRawCountRef.current = accessLogs.length;
        workerRef.current?.postMessage({ type: 'parseAndStore', rawLogs: newRawLogs, logFormat });
        parseWorkerRef.current?.postMessage({ rawLogs: newRawLogs, logFormat, isFirstBatch });
    }, [accessLogs]);

    // Trigger computation when inputs change — debounced to avoid redundant work on rapid changes
    useEffect(() => {
        if (!workerRef.current) return;
        if (computeDebounceRef.current) clearTimeout(computeDebounceRef.current);
        computeDebounceRef.current = setTimeout(() => {
            const seq = ++workerSeqRef.current;
            const locationMapEntries: [string, string][] = filter.location !== null
                ? Array.from(locationMap.entries()).map(([ip, loc]) => [ip, loc.country])
                : [];
            workerRef.current?.postMessage({ type: 'compute', seq, filter, settings, locationMap: locationMapEntries });
        }, 50);
    }, [accessLogs, filter, settings, locationMap]);

    useEffect(() => {
        if (fileUpload) {
            return;
        }

        if (demo) {
            const endDate = new Date();
            const startDate = new Date(endDate);
            startDate.setFullYear(startDate.getFullYear() - 1);
            setAccessLogs(generateNginxLogs({ format: 'extended', count: 120000, startDate, endDate }));
            return;
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

    const getUrl = (positions: {
        filename: string;
        position: number;
    }[] | null, includeCompressed: boolean) => {
        let url = `/api/logs/access?includeCompressed=${includeCompressed}`;
        if (positions) {
            url += `&positions=${encodeURIComponent(JSON.stringify(positions))}`;
        }
        return url;
    }




    const inPeriod = (date: Date, period: Period) => {
        const start = periodStart(period);
        if (!start) {
            return true;
        }
        return date >= start;
    }

    const endpointCounts = useMemo(() => workerResult ? new Map(workerResult.endpointCounts) : new Map<string, number>(), [workerResult]);
    const referrerCounts = useMemo(() => workerResult ? new Map(workerResult.referrerCounts) : new Map<string, number>(), [workerResult]);
    const responseSizes = workerResult?.responseSizes ?? [];
    const versionCounts = workerResult?.versionCounts ?? {};
    const clientCounts = workerResult?.clientCounts ?? {};
    const osCounts = workerResult?.osCounts ?? {};
    const deviceTypeCounts = workerResult?.deviceTypeCounts ?? {};
    const hourCounts = workerResult?.hourCounts ?? new Array(24).fill(0);
    const dayCounts = workerResult?.dayCounts ?? new Array(7).fill(0);

    const activityBuckets = workerResult?.activityBuckets ?? [];
    const activitySuccessRates = workerResult?.activitySuccessRates ?? [];
    const activityPeriodLabels = workerResult?.activityPeriodLabels ?? { start: '', end: '' };
    const activityStepSize = workerResult?.activityStepSize ?? 86400000;
    const activityTimeUnit = workerResult?.activityTimeUnit ?? 'day';
    const requestsTotal = workerResult?.requestsTotal ?? 0;
    const requestsPerHour = workerResult?.requestsPerHour ?? 0;
    const requestsTrend = workerResult?.requestsTrend ?? [];
    const usersTotal = workerResult?.usersTotal ?? 0;
    const usersPerHour = workerResult?.usersPerHour ?? 0;
    const usersTrend = workerResult?.usersTrend ?? [];
    const overallSuccessRate = workerResult?.overallSuccessRate ?? null;
    const successRateTrend = workerResult?.successRateTrend ?? [];
    const locationCounts = workerResult?.locationCounts ?? [];
    const unknownIPs = workerResult?.unknownIPs ?? [];

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
                            <SuccessRate successRate={overallSuccessRate} ratesTrend={successRateTrend} />
                        </div>

                        <div className="flex">
                            <Requests requestsTotal={requestsTotal} requestsPerHour={requestsPerHour} requestsTrend={requestsTrend} />
                            <Users usersTotal={usersTotal} usersPerHour={usersPerHour} usersTrend={usersTrend} />
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
                            period={currentPeriod}
                            activityBuckets={activityBuckets}
                            activitySuccessRates={activitySuccessRates}
                            activityPeriodLabels={activityPeriodLabels}
                            activityStepSize={activityStepSize}
                            activityTimeUnit={activityTimeUnit}
                        />

                        <div className="flex max-xl:flex-col">
                            <Location
                                locationCounts={locationCounts}
                                unknownIPs={unknownIPs}
                                locationMap={locationMap}
                                setLocationMap={setLocationMap}
                                filterLocation={filter.location}
                                setFilterLocation={setLocation}
                                noFetch={fileUpload}
                                demo={demo}
                            />
                            <div className="xl:w-[27em]">
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

                        <div className="w-inherit flex max-xl:flex-col">
                            <div className="max-xl:!w-full flex-1 min-w-0 flex flex-col">
                                <UsageTime hourCounts={hourCounts} filterHour={filter.hour} setFilterHour={setHour} />
                                <UsageDay dayCounts={dayCounts} filterDayOfWeek={filter.dayOfWeek} setFilterDayOfWeek={setDayOfWeek} />
                                <Errors errorLogs={errorLogs} setErrorLogs={setErrorLogs} period={currentPeriod} noFetch={fileUpload} demo={demo} />
                            </div>
                            <div className="self-start">
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


