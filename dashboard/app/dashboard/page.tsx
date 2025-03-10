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
import { Device } from "@/lib/components/device";
import { type Filter, newFilter } from "@/lib/filter";
import { Period, periodStart } from "@/lib/period";
import UsageTime from "@/lib/components/usage-time";
import { Referrals } from "@/lib/components/referrals";

export default function Home() {
    const [data, setData] = useState<Data>([]);
    const [filteredData, setFilteredData] = useState<Data>([]);
    const [accessLogs, setAccessLogs] = useState<string[]>([]);
    const [locationMap, setLocationMap] = useState<Map<string, LocationType>>(new Map());

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

    const setEndpoint = (path: string | null, method: string | null, status: number | null) => {
        setFilter((previous) => ({
            ...previous,
            path,
            method,
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
            console.log('Fetching logs');
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
        const filteredData: Data = [];
        const start = periodStart(filter.period);
        for (const row of data) {
            if (
                (start === null || (row.timestamp && row.timestamp > start))
                && (filter.location === null || (filter.location === locationMap.get(row.ipAddress)?.country))
                && (filter.path === null || (filter.path === row.path))
                && (filter.method === null || (filter.method === row.method))
                && (filter.status === null || (filter.status === row.status))
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
                            <Endpoints data={filteredData} filterPath={filter.path} filterMethod={filter.method} filterStatus={filter.status} setEndpoint={setEndpoint} />
                        </div>

                        <div className="flex">
                            <Version data={filteredData} />
                        </div>
                    </div>

                    {/* Right */}
                    <div className="w-full">
                        <Activity data={filteredData} period={currentPeriod} />

                        <div className="w-full flex">
                            <Location data={filteredData} locationMap={locationMap} setLocationMap={setLocationMap} filterLocation={filter.location} setFilterLocation={setLocation} />
                            <div className="min-w-[28em]">
                                <Device data={filteredData} />
                            </div>
                        </div>

                        <div className="w-full flex">
                            <UsageTime data={filteredData} />
                            <Referrals data={filteredData} filterReferrer={filter.referrer} setFilterReferrer={setReferrer} />
                        </div>
                    </div>
                </div>

            </main>
            <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">

            </footer>
        </div>
    );
}


