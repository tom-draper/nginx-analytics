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
import { parseLogs } from "@/lib/parse";
import { useEffect, useMemo, useState } from "react";
import { Data } from "@/lib/types";
import { Device } from "@/lib/components/device/device";
import { type Filter, newFilter } from "@/lib/filter";
import { Period, periodStart } from "@/lib/period";
import UsageTime from "@/lib/components/usage-time";
import { Referrals } from "@/lib/components/referrals";
import { ResponseSize } from "@/lib/components/response-size";
import { CPU } from "@/lib/components/cpu";
import { Memory } from "@/lib/components/memory";
import { Storage } from "@/lib/components/storage";
import { LogFiles } from "@/lib/components/log-files";

export default function Home() {
    const [data, setData] = useState<Data>([]);
    const [filteredData, setFilteredData] = useState<Data>([]);
    const [accessLogs, setAccessLogs] = useState<string[]>([]);
    const [locationMap, setLocationMap] = useState<Map<string, LocationType>>(new Map());

    const [resources, setResources] = useState<any | null>(null);
    const [loadingResources, setLoadingResources] = useState(true);
    const [historyData, setHistoryData] = useState({
        cpuUsage: [],
        memoryUsage: [],
        timestamps: []
    });


    const [logSizes, setLogSizes] = useState<any | null>(null);
    const [loadingLogSizes, setLoadingLogSizes] = useState(true);

    // Maximum number of data points to keep in history
    const maxHistoryPoints = 900;

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
        const fetchLogs = async () => {
            try {
                const res = await fetch(`/api/logs?type=access&position=${position}`);
                if (!res.ok) {
                    throw new Error("Failed to fetch logs");
                }
                const data = await res.json();

                console.log('data', data);
                if (data.logs) {
                    setAccessLogs((prevLogs) => [...prevLogs, ...data.logs]);
                    position = parseInt(data.position);
                }
            } catch (error) {
                console.error("Error fetching logs:", error);
            }
        };

        let position: number = 0;
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setData(parseLogs(accessLogs))
    }, [accessLogs])

    useEffect(() => {
        const fetchData = async () => {
            setLoadingResources(true);
            try {
                const res = await fetch(`/api/system`);
                if (!res.ok) {
                    setLoadingResources(false);
                    throw new Error("Failed to fetch system resources");
                }
                const data = await res.json();
                console.log(data);
                setResources(data);

                // Update history data with new readings
                setHistoryData(previous => {
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    // Create new arrays with latest data
                    const newCpuUsage = [...previous.cpuUsage, data.cpu.usage];
                    const newMemoryUsage = [...previous.memoryUsage, parseFloat(data.memory.usedPercentage)];
                    const newTimestamps = [...previous.timestamps, now];

                    // Keep only the last MAX_HISTORY_POINTS
                    return {
                        cpuUsage: newCpuUsage.slice(-maxHistoryPoints),
                        memoryUsage: newMemoryUsage.slice(-maxHistoryPoints),
                        timestamps: newTimestamps.slice(-maxHistoryPoints)
                    };
                });
            } catch (error) {
                console.error("Error fetching system resources:", error);
            }
            setLoadingResources(false);
        };

        fetchData();

        // Refresh data every 2 seconds
        const intervalId = setInterval(fetchData, 2000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingLogSizes(true);
            try {
                const response = await fetch(`/api/logs/size`);
                if (!response.ok) {
                    setLoadingLogSizes(false);
                    throw new Error("Failed to fetch log sizes");
                }
                const data = await response.json();
                console.log(data);

                setLogSizes(data);
            } catch (error) {
                console.error("Error fetching log sizes:", error);
            }
            setLoadingLogSizes(false);
        };

        fetchData();

        const intervalId = setInterval(fetchData, 600_000);

        return () => clearInterval(intervalId);
    }, []);

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

        const filteredData: Data = [];
        const start = periodStart(filter.period);
        for (const row of data) {
            if (
                (start === null || (row.timestamp && row.timestamp > start))
                && (filter.location === null || (filter.location === locationMap.get(row.ipAddress)?.country))
                && (filter.path === null || (filter.path === row.path))
                && (filter.method === null || (filter.method === row.method))
                && (filter.status === null || validStatus(row.status))
            ) {
                filteredData.push(row);
            }
        }
        setFilteredData(filteredData);
    }, [data, filter, locationMap]);

    return (
        <div className="">
            <main className="p-12 pt-7">
                <Navigation filterPeriod={filter.period} setFilterPeriod={setPeriod} />

                <div className="flex">
                    {/* Left */}
                    <div className="min-w-[28em]">
                        <div className="flex">
                            <Logo />
                            <SuccessRate data={filteredData} />
                        </div>

                        <div className="flex">
                            <Requests data={filteredData} />
                            <Users data={filteredData} />
                        </div>

                        <div className="flex">
                            <Endpoints data={filteredData} filterPath={filter.path} filterMethod={filter.method} filterStatus={filter.status} setEndpoint={setEndpoint} setStatus={setStatus} />
                        </div>

                        <div className="flex">
                            <ResponseSize data={filteredData} />
                        </div>

                        <div className="flex">
                            <Version data={filteredData} />
                        </div>
                    </div>

                    {/* Right */}
                    <div className="w-full" style={{ width: 'calc(100vw - 48px - 48px - 448px)' }}>
                        <Activity data={filteredData} period={currentPeriod} />

                        <div className="flex max-xl:flex-col">
                            <Location data={filteredData} locationMap={locationMap} setLocationMap={setLocationMap} filterLocation={filter.location} setFilterLocation={setLocation} />
                            <div className="xl:w-[28em]">
                                <Device data={filteredData} />
                            </div>
                        </div>

                        <div className="flex max-xl:flex-col">
                            <CPU resources={resources} loading={loadingResources} historyData={historyData} />
                            <Memory resources={resources} loading={loadingResources} historyData={historyData} />
                        </div>

                        <div className="flex max-xl:flex-col">
                            <Storage resources={resources} loading={loadingResources} />
                            <LogFiles logSizes={logSizes} loading={loadingLogSizes} />
                        </div>

                        <div className="w-inherit">
                            <UsageTime data={filteredData} />
                            <Referrals data={filteredData} filterReferrer={filter.referrer} setFilterReferrer={setReferrer} />
                        </div>

                        <div className="flex max-xl:flex-col">
                            {/* <div className="xl:w-[28em]">
                                <ResponseSize data={filteredData} />
                            </div> */}
                            {/* <SystemResources /> */}
                        </div>

                    </div>
                </div>

            </main>
            <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">

            </footer>
        </div>
    );
}


