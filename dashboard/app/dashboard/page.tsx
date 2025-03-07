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
import { parseLogs } from "@/lib/parse";
import { useEffect, useMemo, useState } from "react";
import { Data } from "@/lib/types";
import { Device } from "@/lib/components/device";
import { type Filter, newFilter } from "@/lib/filter";
import { Period, periodStart } from "@/lib/period";

export default function Home() {
    const [data, setData] = useState<Data>([]);
    const [filteredData, setFilteredData] = useState<Data>([]);
    const [accessLogs, setAccessLogs] = useState<string[]>([]);

    const [filter, setFilter] = useState<Filter>(newFilter());

    const currentPeriod = useMemo(() => filter.period, [filter.period]);

    const setPeriod = (period: Period) => {
        setFilter((previous) => ({
            ...previous,
            period
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
        const interval = setInterval(fetchLogs, 30000); // Polling every 2s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setData(parseLogs(accessLogs))
    }, [accessLogs])

    useEffect(() => {
        const filteredData: Data = [];
        const start = periodStart(filter.period);
        for (const row of data) {
            if (start === null || (row.timestamp && row.timestamp > start)) {
                filteredData.push(row);
            }
        }
        setFilteredData(filteredData);
    }, [data, filter]);

    return (
        <div className="">
            <main className="p-12 pt-7">
                <Navigation period={filter.period} setPeriod={setPeriod}/>

                <div className="flex">
                    {/* Left */}
                    <div className="w-[40em]">
                        <div className="flex">
                            <Logo />
                            <SuccessRate data={filteredData} />
                        </div>

                        <div className="flex">
                            <Requests data={filteredData} />
                            <Users data={filteredData} />
                        </div>

                        <div className="flex">
                            <Endpoints data={filteredData} />
                        </div>

                        <div className="flex">
                            <Version data={filteredData} />
                        </div>
                    </div>

                    {/* Right */}
                    <div className="w-full">
                        <Activity data={filteredData} period={currentPeriod} />

                        <div className="w-full flex">
                            <Location data={filteredData} />
                            <Device data={filteredData} />
                        </div>

                        <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                            <h2 className="font-semibold">
                                Usage Time
                            </h2>

                            <div className="pb-120">
                                Content
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


