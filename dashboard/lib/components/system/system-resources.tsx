'use client';

import { CPU } from "@/lib/components/system/cpu";
import { Memory } from "@/lib/components/system/memory";
import { Storage } from "@/lib/components/system/storage";
import { LogFiles } from "@/lib/components/log-files";
import { HistoryData, LogSizes, SystemInfo } from "../../types";
import { useEffect, useState } from "react";
import { generateRandomLogSizes, generateSystemProfile, updateSystemUsage } from "../../demo";
import { systemMonitoringInterval } from "../../environment";

const MAX_HISTORY_POINTS = 900;

function appendHistory(prev: HistoryData, cpu: number, memory: number): HistoryData {
    const now = Date.now();
    return {
        cpuUsage: [...prev.cpuUsage, cpu].slice(-MAX_HISTORY_POINTS),
        memoryUsage: [...prev.memoryUsage, memory].slice(-MAX_HISTORY_POINTS),
        timestamps: [...prev.timestamps, now].slice(-MAX_HISTORY_POINTS),
    };
}

export function SystemResources({ demo }: { demo: boolean }) {
    const [resources, setResources] = useState<SystemInfo | null>(null);
    const [loadingResources, setLoadingResources] = useState(true);
    const [historyData, setHistoryData] = useState<HistoryData>({
        cpuUsage: [],
        memoryUsage: [],
        timestamps: []
    });

    const [logSizes, setLogSizes] = useState<LogSizes | null>(null);
    const [loadingLogSizes, setLoadingLogSizes] = useState(true);

    useEffect(() => {
        if (demo) {
            const data: SystemInfo = generateSystemProfile();
            setResources(data);

            const updateUsage = () => {
                const updatedData = updateSystemUsage(data);
                setResources(updatedData);
                setHistoryData(prev => appendHistory(
                    prev,
                    updatedData.cpu.usage ?? 0,
                    (updatedData.memory.used / updatedData.memory.total) * 100
                ));
            }

            updateUsage();
            const interval = setInterval(updateUsage, 2000);
            return () => clearInterval(interval);
        }

        const fetchData = async () => {
            setLoadingResources(true);
            try {
                const response = await fetch(`/api/system`);
                if (!response.ok) {
                    setLoadingResources(false);
                    if (interval && (response.status === 403 || response.status === 404)) {
                        clearInterval(interval);
                        return;
                    }
                    throw new Error("Failed to fetch system resources");
                }
                const data: SystemInfo = await response.json();
                setResources(data);
                setHistoryData(prev => appendHistory(
                    prev,
                    data.cpu.usage ?? 0,
                    (data.memory.used / data.memory.total) * 100
                ));
            } catch (error) {
                console.error("Error fetching system resources:", error);
            }
            setLoadingResources(false);
        };

        fetchData();
        const interval = setInterval(fetchData, systemMonitoringInterval);
        return () => clearInterval(interval);
    }, [demo]);

    useEffect(() => {
        if (demo) {
            const logSizes = generateRandomLogSizes();
            setLogSizes(logSizes);
            return;
        }

        const fetchData = async () => {
            setLoadingLogSizes(true);
            try {
                const response = await fetch(`/api/system/logs`);
                if (!response.ok) {
                    setLoadingLogSizes(false);
                    if (interval && (response.status === 403 || response.status === 404)) {
                        clearInterval(interval);
                        return;
                    }
                    throw new Error("Failed to fetch log sizes");
                }

                const data = await response.json();

                setLogSizes(data);
            } catch (error) {
                console.error("Error fetching log sizes:", error);
            }
            setLoadingLogSizes(false);
        };

        fetchData();
        const interval = setInterval(fetchData, 600_000); // 10 minute interval
        return () => clearInterval(interval);
    }, [demo]);

    if (!resources) {
        return null;
    }

    return (
        <>
            <div className="flex max-xl:flex-col">
                <div className="xl:w-1/2">
                    <CPU resources={resources} loading={loadingResources} historyData={historyData} />
                </div>
                <div className="xl:w-1/2">
                    <Memory resources={resources} loading={loadingResources} historyData={historyData} />
                </div>
            </div>

            <div className="flex max-xl:flex-col">
                <Storage resources={resources} loading={loadingResources} />
                <LogFiles logSizes={logSizes} loading={loadingLogSizes} />
            </div>
        </>
    );
}
