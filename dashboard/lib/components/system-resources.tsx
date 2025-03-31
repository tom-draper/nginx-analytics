'use client';

import { CPU } from "@/lib/components/cpu";
import { Memory } from "@/lib/components/memory";
import { Storage } from "@/lib/components/storage";
import { LogFiles } from "@/lib/components/log-files";
import { HistoryData, LogSizes, SystemInfo } from "../types";
import { useEffect, useState } from "react";
import { generateSystemProfile, updateSystemUsage } from "../demo";

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

    // Maximum number of data points to keep in history
    const maxHistoryPoints = 900;

    useEffect(() => {
        if (demo) {
            const data: SystemInfo = generateSystemProfile();
            setResources(data);

            const updateUsage = () => {
                const updatedData = updateSystemUsage(data);
                setResources(updatedData);
                setHistoryData((previous: HistoryData) => {
                    const now = Date.now();

                    // Create new arrays with latest data
                    const newCpuUsage = [...previous.cpuUsage, updatedData.cpu.usage ?? 0];
                    const newMemoryUsage = [...previous.memoryUsage, ((updatedData.memory.used) / updatedData.memory.total) * 100];
                    const newTimestamps = [...previous.timestamps, now];

                    // Keep only the last MAX_HISTORY_POINTS
                    return {
                        cpuUsage: newCpuUsage.slice(-maxHistoryPoints),
                        memoryUsage: newMemoryUsage.slice(-maxHistoryPoints),
                        timestamps: newTimestamps.slice(-maxHistoryPoints)
                    };
                });
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

                // Update history data with new readings
                setHistoryData((previous: HistoryData) => {
                    const now = Date.now();

                    // Create new arrays with latest data
                    const newCpuUsage = [...previous.cpuUsage, data.cpu.usage ?? 0];
                    const newMemoryUsage = [...previous.memoryUsage, ((data.memory.used) / data.memory.total) * 100];
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
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (demo) {
            return;
        }

        const fetchData = async () => {
            setLoadingLogSizes(true);
            try {
                const response = await fetch(`/api/logs/size`);
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
        const interval = setInterval(fetchData, 600_000);
        return () => clearInterval(interval);
    }, []);

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