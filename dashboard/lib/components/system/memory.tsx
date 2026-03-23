'use client';

import { HistoryData, SystemInfo } from "../../types";
import { formatBytes } from "../../format";
import { ResourceUsageChart } from "./resource-usage-chart";

// Custom circular progress component
const CircularProgress = ({ value, text, color }: { value: number, text: string, color: string }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="transparent"
                />
                <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute text-sm font-semibold" style={{ color }}>
                {text}
            </div>
        </div>
    );
};

const getColorForUsage = (usage: number) => {
    if (usage < 60) return "#1af073"; // green
    if (usage < 90) return "#ffaa4b"; // amber
    return "#ff5050"; // red
};

export function Memory({ resources, loading, historyData }: { resources: SystemInfo | null, loading: boolean, historyData: HistoryData }) {
    if (!resources) {
        return (
            <div className="card flex-2 flex flex-col px-4 py-3 m-3 relative">
                <h2 className="font-semibold text-lg">
                    Memory
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

    // Get percentage values for both memory metrics
    const totalUsedMemory = ((resources.memory.total - resources.memory.free) / resources.memory.total) * 100;
    const availableMemory = ((resources.memory.total - resources.memory.available) / resources.memory.total) * 100;

    const currentMemColor = getColorForUsage(totalUsedMemory);

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative h-[calc(100%-1.5rem)]">
            <h2 className="font-semibold text-lg">
                Memory
            </h2>

            {/* Memory Usage with chart */}
            <div className="p-2 pt-3 h-[inherit] flex flex-col">
                <div className="flex-grow">
                    <div className="flex items-start">
                        <CircularProgress
                            value={totalUsedMemory}
                            text={`${totalUsedMemory.toFixed(1)}%`}
                            color={currentMemColor}
                        />
                        <div className="ml-4 flex flex-col justify-center text-xs mt-0">
                            <div>Used: {formatBytes(resources.memory.used)}</div>
                            <div>Free: {formatBytes(resources.memory.free)}</div>
                            <div>Available: {formatBytes(resources.memory.available)}</div>
                            <div>Total: {formatBytes(resources.memory.total)}</div>
                        </div>
                    </div>

                    {/* Layered memory usage bar */}
                    <div className="mt-4">
                        <div className="h-2 w-full bg-[var(--hover-background)] rounded-full overflow-hidden relative">
                            {/* Bottom layer - Used memory (amber) */}
                            <div
                                className="h-full rounded-full absolute top-0 left-0"
                                style={{
                                    width: `${totalUsedMemory}%`,
                                    backgroundColor: currentMemColor + 'aa'
                                }}
                            ></div>
                            {/* Top layer - Total minus available memory (dynamic color) */}
                            <div
                                className="h-full rounded-full absolute top-0 left-0"
                                style={{
                                    width: `${availableMemory}%`,
                                    backgroundColor: currentMemColor
                                }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs mt-1 mb-3">
                            <span>0 GB</span>
                            <span>{formatBytes(resources.memory.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Memory Usage Chart */}
                <div>
                    <ResourceUsageChart
                        data={historyData.memoryUsage}
                        timestamps={historyData.timestamps}
                        label="Memory usage"
                        color={currentMemColor}
                    />
                </div>
            </div>
        </div>
    );
}
