'use client';

import { Clock } from "lucide-react";
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
import { HistoryData, SystemInfo } from "../types";

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

const colors = [
    'rgb(26, 240, 115)',
    'rgb(102, 201, 92)',
    'rgb(153, 209, 85)',
    'rgb(204, 217, 78)',
    'rgb(255, 210, 75)',
    'rgb(255, 170, 75)',
    'rgb(255, 130, 75)',
    'rgb(255, 100, 75)',
    'rgb(255, 90, 80)',
    'rgb(255, 80, 80)',
]

// CPU Core visualization component
const CPUCores = ({ cores, usage }: { cores: number, usage: number }) => {
    // Generate mock data for individual core usage
    const generateCoreUsages = (coreCount: number, avgUsage: number) => {
        // Create a somewhat realistic distribution around the average
        return Array.from({ length: coreCount }, () => {
            const variance = Math.random() * 30 - 15; // ±15% variance
            return Math.min(Math.max(avgUsage + variance, 5), 100); // Clamp between 5% and 100%
        });
    };

    const coreUsages = generateCoreUsages(cores, usage);

    // Get color based on usage percentage
    const getColorForUsage = (usage: number) => {
        return colors[Math.min(Math.floor(usage / 10), 9)]
    };

    return (
        <div className="mt-1">
            <div className="grid grid-cols-4 gap-1">
                {coreUsages.map((coreUsage, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div
                            className="h-8 w-full rounded-xs grid place-items-center"
                            style={{ backgroundColor: getColorForUsage(coreUsage) }}
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

// Single resource usage chart component
const ResourceUsageChart = ({ data, timestamps, label, color, height = "h-32" }: {data: any, timestamps: any, label: any, color: string, height?: string}) => {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        // animation: {
        //   duration: 500
        // },
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
                    title: function (tooltipItems: any) {
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
            <Line options={chartOptions as any} data={chartData} />
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

    // Get percentage values
    const cpuUsage = resources.cpu.usage;

    const getColorForUsage = (usage: number) => {
        if (usage < 50) return "#1af073"; // green
        if (usage < 80) return "#ffaa4b"; // amber
        return "#ff5050"; // red
    };

    const currentCPUColor = getColorForUsage(cpuUsage || 0);

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative">
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
            <div className="p-2">
                {/* CPU Cores visualization */}
                <CPUCores cores={resources.cpu.cores} usage={cpuUsage || 0} />

                {/* CPU Usage Chart */}
                <div className="mt-4">
                    {/* <div className="text-xs font-medium mb-1 text-gray-500">CPU Usage History</div> */}
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