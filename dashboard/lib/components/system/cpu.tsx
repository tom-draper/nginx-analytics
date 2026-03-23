'use client';

import { Clock } from "lucide-react";
import { HistoryData, SystemInfo } from "../../types";
import { gradient } from "../../colors";
import { ResourceUsageChart } from "./resource-usage-chart";

function formatUptime(seconds: number) {
    const units = [
        { label: 'y', value: 31536000 }, // 1 year = 60 * 60 * 24 * 365
        { label: 'd', value: 86400 },    // 1 day = 60 * 60 * 24
        { label: 'h', value: 3600 },     // 1 hour = 60 * 60
        { label: 'm', value: 60 },       // 1 minute = 60
        { label: 's', value: 1 }         // 1 second
    ];

    const result = [];
    for (const { label, value } of units) {
        const amount = Math.floor(seconds / value);
        if (amount > 0) {
            result.push(`${amount}${label}`);
            seconds %= value;
        }
    }
    return result.length > 0 ? result.join(' ') : '0s';
}

const getColorForUsage = (usage: number) => {
    if (usage < 50) return "#1af073"; // green
    if (usage < 80) return "#ffaa4b"; // amber
    return "#ff5050"; // red
};

// CPU Core visualization component
const CPUCores = ({ coreUsages }: { coreUsages: number[] }) => {
    const getCoreColor = (usage: number) => {
        return gradient[Math.min(Math.floor(usage / 10), 9)]
    };

    return (
        <div className="mt-1 flex-grow">
            <div className="grid grid-cols-4 gap-1 h-full">
                {coreUsages.map((coreUsage, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div
                            className="min-h-8 h-full w-full rounded-xs grid place-items-center"
                            style={{ backgroundColor: getCoreColor(coreUsage) }}
                            title={`Core ${index}: ${coreUsage.toFixed(1)}%`}
                        >
                            <div className="text-xs text-[var(--text)] opacity-70 font-semibold">{coreUsage.toFixed(0)}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export function CPU({ resources, loading, historyData }: { resources: SystemInfo | null, loading: boolean, historyData: HistoryData }) {
    if (!resources) {
        return (
            <div className="card flex-2 flex flex-col px-4 py-3 m-3 relative">
                <h2 className="font-semibold text-lg">
                    CPU
                </h2>
                <div className="flex-1 grid place-items-center">
                    {loading ? (
                        <div className="flex-1 rounded mx-1 my-1 pb-4 grid place-items-center">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="flex-1 rounded mx-1 my-1 grid place-items-center" title={`No locations found`}>
                            <div className="text-[var(--text-muted3)] pb-2">Failed to fetch resources</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const cpuUsage = resources.cpu.usage;
    const cpuCoreUsage = resources.cpu.coreUsage;
    const currentCPUColor = getColorForUsage(cpuUsage || 0);

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative h-[calc(100%-1.5rem)]">
            <h2 className="font-semibold text-lg">
                CPU
            </h2>
            <div className="text-xs text-[var(--text-muted3)] mb-4 absolute top-4 right-5 flex">
                <Clock className="inline-block w-3 h-3 mr-1 self-center" />
                <div>
                    Uptime: {formatUptime(resources.uptime)}
                </div>
            </div>

            {/* CPU Usage with chart */}
            <div className="p-2 h-[inherit] flex flex-col">
                {/* CPU Cores visualization */}
                <CPUCores coreUsages={cpuCoreUsage || []} />

                {/* CPU Usage Chart */}
                <div className="mt-4">
                    <ResourceUsageChart
                        data={historyData.cpuUsage}
                        timestamps={historyData.timestamps}
                        label=" CPU usage"
                        color={currentCPUColor}
                    />
                </div>
            </div>
        </div>
    );
}
