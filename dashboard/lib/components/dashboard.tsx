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
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Device } from "@/lib/components/device/device";
import { type Filter, newFilter } from "@/lib/filter";
import { Period, periodStart } from "@/lib/period";
import UsageTime from "@/lib/components/usage-time";
import { Referrals } from "@/lib/components/referrals";
import { ResponseSize } from "@/lib/components/response-size";
import { SystemResources } from "@/lib/components/system-resources";
import generateNginxLogs from "@/lib/demo";
import { NginxLog } from "@/lib/types";
import Errors from "@/lib/components/errors";
import { Settings } from "@/lib/components/settings";
import { type Settings as SettingsType, newSettings } from "@/lib/settings";
import { exportCSV } from "@/lib/export";
import NetworkBackground from "./network-background";
import FileUpload from "./file-upload";


export default function Dashboard({ fileUpload }: { fileUpload: boolean }) {
    const [accessLogs, setAccessLogs] = useState<string[]>([]);
    const [logs, setLogs] = useState<NginxLog[]>([]);
    const [filteredData, setFilteredData] = useState<NginxLog[]>([]);

    const [locationMap, setLocationMap] = useState<Map<string, LocationType>>(new Map());

    const [settings, setSettings] = useState<SettingsType>(newSettings());
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const ignoreParams = useMemo(() => settings.ignoreParams, [settings.ignoreParams]);

    const [filter, setFilter] = useState<Filter>(newFilter());

    const currentPeriod = useMemo(() => filter.period, [filter.period]);

    const monitorSystemResources = process.env.NEXT_PUBLIC_NGINX_ANALYTICS_MONITOR_SYSTEM_RESOURCES === 'true';

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
        if (!fileUpload) {
            fetchLogs();
            // setAccessLogs(generateNginxLogs({format: 'extended', count: 100000, startDate: new Date('2024-11-10T00:00:00Z'), endDate: new Date()}))
            const interval = setInterval(fetchLogs, 30000); // Polling every 30s
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        const logs = parseNginxLogs(accessLogs)
        setLogs(logs);
    }, [accessLogs])


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
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <FileUpload setAccessLogs={setAccessLogs}/>
                </div>
            </div>
        )
    }

    return (
        <div className="">
            <main className="sm:p-12 pt-7">
                <Settings settings={settings} setSettings={setSettings} showSettings={showSettings} setShowSettings={setShowSettings} filter={filter} exportCSV={() => { exportCSV(logs) }} />

                <Navigation filterPeriod={filter.period} setFilterPeriod={setPeriod} setShowSettings={setShowSettings} />

                <div className="flex max-[950px]:flex-col">
                    {/* Left */}
                    <div className="min-[950px]:w-[27em]">
                        <div className="flex">
                            <Logo />
                            <SuccessRate data={filteredData} />
                        </div>

                        <div className="flex">
                            <Requests data={filteredData} />
                            <Users data={filteredData} />
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
                            <Location data={filteredData} locationMap={locationMap} setLocationMap={setLocationMap} filterLocation={filter.location} setFilterLocation={setLocation} fileUpload={fileUpload} />
                            <div className="xl:w-[27em]">
                                <Device data={filteredData} />
                            </div>
                        </div>

                        {monitorSystemResources && <SystemResources />}

                        <div className="w-inherit flex max-xl:flex-col">
                            <div className="max-xl:!w-full flex-1" style={{ width: 'calc(100vw - 48px - 48px - 416px - 28em)' }}>
                                <UsageTime data={filteredData} />
                            </div>
                            <div>
                                <Referrals data={filteredData} filterReferrer={filter.referrer} setFilterReferrer={setReferrer} />
                            </div>
                        </div>

                        <Errors fileUpload={fileUpload} />
                    </div>
                </div>
            </main>
            <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">

            </footer>
        </div>
    );
}


