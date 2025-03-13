'use client';

import { useEffect, useState } from "react";
import { Clock, Cpu, HardDrive, Activity } from "lucide-react";
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
const CircularProgress = ({ value, text, color }) => {
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

// CPU Core visualization component
const CPUCores = ({ cores, usage }) => {
    // Generate mock data for individual core usage
    const generateCoreUsages = (coreCount, avgUsage) => {
        // Create a somewhat realistic distribution around the average
        return Array.from({ length: coreCount }, () => {
            const variance = Math.random() * 30 - 15; // ±15% variance
            return Math.min(Math.max(avgUsage + variance, 5), 100); // Clamp between 5% and 100%
        });
    };

    const coreUsages = generateCoreUsages(cores, usage);

    // Get color based on usage percentage
    const getColorForUsage = (usage) => {
        if (usage < 30) return "var(--highlight"; // green
        if (usage < 70) return "var(--warn)"; // amber
        return "var(--error)"; // red
    };

    return (
        <div className="mt-2">
            <div className="grid grid-cols-4 gap-1">
                {coreUsages.map((coreUsage, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div
                            className="h-8 w-full rounded-xs grid place-items-center"
                            style={{ backgroundColor: getColorForUsage(coreUsage) }}
                            title={`Core ${index}: ${coreUsage.toFixed(1)}%`}
                        >
                            <div className="text-xs opacity-70">{coreUsage.toFixed(0)}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Single resource usage chart component
const ResourceUsageChart = ({ data, timestamps, label, color, height = "h-32" }) => {
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

export function SystemResources() {
    const [resources, setResources] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyData, setHistoryData] = useState({
        cpuUsage: [],
        memoryUsage: [],
        timestamps: []
    });

    // Maximum number of data points to keep in history
    const MAX_HISTORY_POINTS = 500;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/system`);
                if (!res.ok) {
                    throw new Error("Failed to fetch system resources");
                }
                const data = await res.json();
                setResources(data);

                // Update history data with new readings
                setHistoryData(prev => {
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    // Create new arrays with latest data
                    const newCpuUsage = [...prev.cpuUsage, data.cpu.usage];
                    const newMemoryUsage = [...prev.memoryUsage, parseFloat(data.memory.usedPercentage)];
                    const newTimestamps = [...prev.timestamps, now];

                    // Keep only the last MAX_HISTORY_POINTS
                    return {
                        cpuUsage: newCpuUsage.slice(-MAX_HISTORY_POINTS),
                        memoryUsage: newMemoryUsage.slice(-MAX_HISTORY_POINTS),
                        timestamps: newTimestamps.slice(-MAX_HISTORY_POINTS)
                    };
                });
            } catch (error) {
                console.error("Error fetching system resources:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Refresh data every 2 seconds
        const intervalId = setInterval(fetchData, 2000);

        return () => clearInterval(intervalId);
    }, []);

    if (loading) {
        return (
            <div className="card flex-2 px-4 py-3 m-3 min-h-64">
                <h2 className="font-semibold">System Resources</h2>
                <div className="flex justify-center items-center h-48">
                    <div className="animate-pulse">Loading system data...</div>
                </div>
            </div>
        );
    }

    if (!resources) {
        return (
            <div className="card flex-2 px-4 py-3 m-3">
                <h2 className="font-semibold">System Resources</h2>
                <div className="flex justify-center items-center h-48 text-red-500">
                    Failed to load system data
                </div>
            </div>
        );
    }

    // Format bytes to human readable format
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    function formatUptime(seconds: number) {
        const units = [
            { label: 'y', value: 31536000 }, // 1 year = 60 * 60 * 24 * 365
            { label: 'd', value: 86400 },    // 1 day = 60 * 60 * 24
            { label: 'h', value: 3600 },     // 1 hour = 60 * 60
            { label: 'm', value: 60 },       // 1 minute = 60
            { label: 's', value: 1 }         // 1 second
        ];

        let result = [];

        for (const { label, value } of units) {
            const amount = Math.floor(seconds / value);
            if (amount > 0) {
                result.push(`${amount}${label}`);
                seconds %= value;
            }
        }

        return result.length > 0 ? result.join(' ') : '0s';
    }

    // Find the primary disk (largest one that's not a snap mount)
    const primaryDisk = resources.disk.find(d =>
        d.mountedOn === "/" || d.mountedOn === "/mnt/c"
    );

    // Get percentage values
    const cpuUsage = resources.cpu.usage;
    const memoryUsage = parseFloat(resources.memory.usedPercentage);
    const diskUsage = primaryDisk ? parseInt(primaryDisk.usedPercentage) : 0;

    // Get color based on usage percentage
    const getColorForUsage = (usage) => {
        if (usage < 50) return "var(--highlight)"; // green
        if (usage < 80) return "var(--warn)"; // amber
        return "var(--error)"; // red
    };

    // Colors for charts
    const cpuColor = "#f59e0b"; // amber
    const memoryColor = "#3b82f6"; // blue

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative">
            <h2 className="font-semibold text-lg">
                System Resources
            </h2>
            <div className="text-xs text-gray-500 mb-4 absolute top-4 right-5">
                <Clock className="inline-block w-3 h-3 mr-1" />
                Uptime: {formatUptime(resources.uptime.seconds)}
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-3">
                {/* CPU Usage with chart */}
                <div className="p-4 pt-3 border border-[var(--border-color)] rounded md:w-1/2">
                    <div className="flex justify-between mb-2">
                        <div className="flex items-center">
                            <Cpu className="w-4 h-4 mr-2" />
                            <span className="font-medium text-sm">CPU</span>
                        </div>
                        <div className="text-sm font-bold" style={{ color: getColorForUsage(cpuUsage) }}>
                            {cpuUsage.toFixed(1)}%
                        </div>
                    </div>

                    {/* CPU Cores visualization */}
                    <CPUCores cores={resources.cpu.cores} usage={cpuUsage} />

                    {/* CPU Usage Chart */}
                    <div className="mt-4">
                        {/* <div className="text-xs font-medium mb-1 text-gray-500">CPU Usage History</div> */}
                        <ResourceUsageChart
                            data={historyData.cpuUsage}
                            timestamps={historyData.timestamps}
                            label="CPU Usage"
                            color={cpuColor}
                        />
                    </div>
                </div>

                {/* Memory Usage with chart */}
                <div className="p-4 pt-3 border border-[var(--border-color)] rounded flex-grow md:w-1/2">
                    <div className="flex items-center mb-2">
                        <Activity className="w-4 h-4 mr-2" />
                        <span className="font-medium text-sm">Memory</span>
                    </div>

                    <div className="flex items-start">
                        <CircularProgress
                            value={memoryUsage}
                            text={`${memoryUsage}%`}
                            color={getColorForUsage(memoryUsage)}
                        />
                        <div className="ml-4 flex flex-col justify-center text-xs mt-2">
                            <div>Total: {formatBytes(resources.memory.total)}</div>
                            <div>Used: {formatBytes(resources.memory.used)}</div>
                            <div>Free: {formatBytes(resources.memory.free)}</div>
                        </div>
                    </div>

                    {/* Memory usage bar */}
                    <div className="mt-4">
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${memoryUsage}%`,
                                    backgroundColor: getColorForUsage(memoryUsage)
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
                        {/* <div className="text-xs font-medium mb-1 text-gray-500">Memory Usage History</div> */}
                        <ResourceUsageChart
                            data={historyData.memoryUsage}
                            timestamps={historyData.timestamps}
                            label="Memory Usage"
                            color={memoryColor}
                        />
                    </div>
                </div>
            </div>

            {/* Disk Usage - Moved to the bottom as less important */}
            <div className="mt-4 p-4 pt-3 border border-[var(--border-color)] rounded">
                <div className="flex items-center mb-2">
                    <HardDrive className="w-3 h-3 mr-2" />
                    <span className="font-medium text-sm">Disk Storage ({primaryDisk?.mountedOn || "N/A"})</span>
                </div>

                <div className="h-2 w-full bg-[var(--hover-background)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${diskUsage}%`,
                            backgroundColor: getColorForUsage(diskUsage)
                        }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span>Used: {primaryDisk?.used || "N/A"} ({diskUsage}%)</span>
                    <span>Free: {primaryDisk?.available || "N/A"}</span>
                    <span>Total: {primaryDisk?.size || "N/A"}</span>
                </div>
            </div>
        </div>
    );
}