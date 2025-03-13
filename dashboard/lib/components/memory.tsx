'use client';

import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Custom circular progress component
const CircularProgress = ({ value, text, color }: {value: number, text: string, color: string}) => {
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

// Single resource usage chart component
const ResourceUsageChart = ({ data, timestamps, label, color, height = "h-32" }) => {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            
        },
        scales: {
            x: {
                display: false
            },
            y: {
                min: 0,
                max: 100,
                ticks: {
                    stepSize: 25,
                    color: 'rgba(107, 114, 128, 0.7)',
                    font: {
                        size: 10
                    }
                },
                grid: {
                    color: 'rgba(229, 231, 235, 0.3)'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                intersect: false,
                mode: 'index',
                callbacks: {
                    title: function (tooltipItems) {
                        return timestamps[tooltipItems[0].dataIndex];
                    }
                }
            }
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 3
            },
            line: {
                tension: 0.3,
            }
        }
    };

    const chartData = {
        labels: timestamps,
        datasets: [
            {
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: `${color}20`, // 20 = 12% opacity in hex
                fill: true,
                borderWidth: 2
            }
        ]
    };

    return (
        <div className={`w-[100%] ${height}`}>
            <Line options={chartOptions} data={chartData} />
        </div>
    );
};

export function Memory({ resources, loading, historyData }: { resources: any, loading: boolean, historyData: any}) {
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

    // Format bytes to human readable format
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Get percentage values
    const memoryUsage = parseFloat(resources.memory.usedPercentage);

    // Get color based on usage percentage
    const getColorForUsage = (usage: number) => {
        if (usage < 50) return "#1af073"; // green
        if (usage < 80) return "#ffaa4b"; // amber
        return "#ff5050"; // red
    };

    // Get the current memory usage color instead of using a fixed color
    const currentMemColor = getColorForUsage(memoryUsage);

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative">
            <h2 className="font-semibold text-lg">
                Memory
            </h2>

            {/* Memory Usage with chart */}
            <div className="p-2 pt-3">
                <div className="flex items-start">
                    <CircularProgress
                        value={memoryUsage}
                        text={`${memoryUsage.toFixed(1)}%`}
                        color={currentMemColor}
                    />
                    <div className="ml-4 flex flex-col justify-center text-xs mt-2">
                        <div>Total: {formatBytes(resources.memory.total)}</div>
                        <div>Used: {formatBytes(resources.memory.used)}</div>
                        <div>Free: {formatBytes(resources.memory.free)}</div>
                    </div>
                </div>

                {/* Memory usage bar */}
                <div className="mt-4">
                    <div className="h-2 w-full bg-[var(--hover-background)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${memoryUsage}%`,
                                backgroundColor: currentMemColor
                            }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1 mb-3">
                        <span>0 GB</span>
                        <span>{formatBytes(resources.memory.total)}</span>
                    </div>
                </div>

                {/* Memory Usage Chart */}
                <div>
                    <ResourceUsageChart
                        data={historyData.memoryUsage}
                        timestamps={historyData.timestamps}
                        label="Memory Usage"
                        color={currentMemColor}
                    />
                </div>
            </div>
        </div>
    );
}