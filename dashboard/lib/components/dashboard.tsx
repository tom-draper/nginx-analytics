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
import { parseNginxLogs } from "@/lib/parse";
import { useEffect, useMemo, useState } from "react";
import { Device } from "@/lib/components/device/device";
import { type Filter, newFilter } from "@/lib/filter";
import { Period, periodStart } from "@/lib/period";
import UsageTime from "@/lib/components/usage-time";
import { Referrals } from "@/lib/components/referrals";
import { ResponseSize } from "@/lib/components/response-size";
import { SystemResources } from "@/lib/components/system-resources";
import { generateNginxLogs } from "@/lib/demo";
import { NginxLog } from "@/lib/types";
import Errors from "@/lib/components/errors";
import { Settings } from "@/lib/components/settings";
import { type Settings as SettingsType, newSettings } from "@/lib/settings";
import { exportCSV } from "@/lib/export";
import NetworkBackground from "./network-background";
import FileUpload from "./file-upload";


export default function Dashboard({ fileUpload, demo }: { fileUpload: boolean, demo: boolean }) {
    const [accessLogs, setAccessLogs] = useState<string[]>([]);
    const [logs, setLogs] = useState<NginxLog[]>([]);
    const [filteredData, setFilteredData] = useState<NginxLog[]>([]);

    const [errorLogs, setErrorLogs] = useState<string[]>([]);

    const [locationMap, setLocationMap] = useState<Map<string, LocationType>>(new Map());

    const [settings, setSettings] = useState<SettingsType>(newSettings());
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const ignoreParams = useMemo(() => settings.ignoreParams, [settings.ignoreParams]);

    const [filter, setFilter] = useState<Filter>(newFilter());

    const currentPeriod = useMemo(() => filter.period, [filter.period]);

    const setPeriod = (period: Period) => {
        setFilter((previous) => ({
            ...previous,
            period
        }))
    }

    const setLocation = (location: string | null) => {
        setFilter((previous) => ({
            ...previous,
            location
        }))
    }

    const setEndpoint = (path: string | null, method: string | null, status: number | [number, number][] | null) => {
        setFilter((previous) => ({
            ...previous,
            path,
            method,
            status
        }))
    }

    const setStatus = (status: number | [number, number][] | null) => {
        setFilter((previous) => ({
            ...previous,
            status
        }))
    }

    const setReferrer = (referrer: string | null) => {
        setFilter((previous) => ({
            ...previous,
            referrer
        }))
    }

    useEffect(() => {
        if (fileUpload) {
            return;
        }

        if (demo) {
            const demoLogs = generateNginxLogs({ format: 'extended', count: 120000, startDate: new Date('2023-01-01') });
            setAccessLogs(demoLogs)
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

    useEffect(() => {
        const initPeriod = (logs: NginxLog[]) => {
            if (!logs.length || !logs[0].timestamp) {
                return;
            }
            let maxDate = logs[0].timestamp;
            for (const log of logs) {
                if (log.timestamp && (!maxDate || log.timestamp > maxDate)) {
                    maxDate = log.timestamp;
                }
            }

            if (inPeriod(maxDate, 'week')) {
                setPeriod('week');
            } else if (inPeriod(maxDate, 'month')) {
                setPeriod('month');
            } else if (inPeriod(maxDate, '6 months')) {
                setPeriod('6 months');
            } else {
                setPeriod('all time');
            }
        }

        const parsedLogs = parseNginxLogs(accessLogs)
        if (logs.length === 0) {
            initPeriod(parsedLogs);
        }
        setLogs(parsedLogs);
    }, [accessLogs])



    const inPeriod = (date: Date, period: Period) => {
        const start = periodStart(period);
        if (!start) {
            return true;
        }
        return date >= start;
    }

    useEffect(() => {
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
        }

        const filteredData: NginxLog[] = [];
        const start = periodStart(filter.period);
        for (const row of logs) {
            if (
                (start === null || (row.timestamp && row.timestamp > start))
                && (filter.location === null || (locationMap.get(row.ipAddress)?.country === filter.location))
                && (filter.path === null || (row.path === filter.path))
                && (filter.method === null || (row.method === filter.method))
                && (filter.status === null || validStatus(row.status))
                && (!settings.ignore404 || row.status !== 404)
                && (filter.referrer === null || (row.referrer === filter.referrer))
            ) {
                filteredData.push(row);
            }
        }
        setFilteredData(filteredData);
    }, [logs, filter, settings, locationMap]);


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
                            <SuccessRate data={filteredData} period={currentPeriod} />
                        </div>

                        <div className="flex">
                            <Requests data={filteredData} period={currentPeriod} />
                            <Users data={filteredData} period={currentPeriod} />
                        </div>

                        <div className="flex">
                            <Endpoints data={filteredData} filterPath={filter.path} filterMethod={filter.method} filterStatus={filter.status} setEndpoint={setEndpoint} setStatus={setStatus} ignoreParams={ignoreParams} />
                        </div>

                        <div className="flex">
                            <ResponseSize data={filteredData} />
                        </div>

                        <div className="flex">
                            <Version data={filteredData} />
                        </div>
                    </div>

                    {/* Right */}
                    <div className="min-[950px]:w-[calc(100vw-48px-48px-416px)]">
                        <Activity data={filteredData} period={currentPeriod} />

                        <div className="flex max-xl:flex-col">
                            <Location data={filteredData} locationMap={locationMap} setLocationMap={setLocationMap} filterLocation={filter.location} setFilterLocation={setLocation} noFetch={fileUpload} demo={demo} />
                            <div className="xl:w-[27em]">
                                <Device data={filteredData} />
                            </div>
                        </div>

                        <SystemResources demo={demo} />

                        <div className="w-inherit flex max-xl:flex-col">
                            <div className="max-xl:!w-full flex-1" style={{ width: 'calc(100vw - 48px - 48px - 416px - 28em)' }}>
                                <UsageTime data={filteredData} />
                                <Errors errorLogs={errorLogs} setErrorLogs={setErrorLogs} period={currentPeriod} noFetch={fileUpload} demo={demo} />
                            </div>
                            <div>
                                <Referrals data={filteredData} filterReferrer={filter.referrer} setFilterReferrer={setReferrer} />
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


