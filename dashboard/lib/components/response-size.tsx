import { Data } from "@/lib/types";
import { useEffect, useState, useRef } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Stats = {
    min: number,
    avg: number,
    max: number
}

function formatBytes(bytes: number) {
    if (bytes === 0) {
        return '0 Bytes';
    }

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
}

function generateHistogramData(data: number[], maxBinCount = 500) {
    // Filter out zero values
    const filteredData = data.filter(value => value !== 0);

    if (filteredData.length === 0) {
        return { bins: [], binLabels: [] };
    }

    // Sort the data to calculate quartiles
    const sortedData = [...filteredData].sort((a, b) => a - b);

    // Calculate quartiles
    const lqIndex = Math.floor(sortedData.length * 0.1);
    const uqIndex = Math.floor(sortedData.length * 0.95);

    const lowerQuartile = sortedData[lqIndex];
    const upperQuartile = sortedData[uqIndex];

    // Only use data between lower and upper quartiles
    const quartileData = sortedData.filter(value =>
        value >= lowerQuartile && value <= upperQuartile
    );

    if (quartileData.length === 0) {
        return { bins: [], binLabels: [] };
    }

    // Get min and max from the quartile-filtered data
    const min = Math.min(...quartileData);
    const max = Math.max(...quartileData);

    // Round min and max to whole numbers
    const roundedMin = Math.floor(min);
    const roundedMax = Math.ceil(max);
    const range = roundedMax - roundedMin;

    // If range is less than or equal to maxBinCount, use unit-width bins
    if (range <= maxBinCount) {
        // Create array of bins with zeros
        const bins = Array(range + 1).fill(0);
        const binLabels = [];

        // Create bin labels for each whole number
        for (let i = 0; i <= range; i++) {
            const value = roundedMin + i;
            binLabels.push(formatBytes(value));
        }

        // Fill bins with counts
        quartileData.forEach(value => {
            const roundedValue = Math.round(value);
            const binIndex = roundedValue - roundedMin;

            // Ensure value falls within our bin range
            if (binIndex >= 0 && binIndex < bins.length) {
                bins[binIndex]++;
            }
        });

        return { bins, binLabels };
    }
    // If range exceeds maxBinCount, use adaptive bin width
    else {
        const binWidth = range / maxBinCount;
        const bins = Array(maxBinCount).fill(0);
        const binLabels = [];

        // Create bin labels
        for (let i = 0; i < maxBinCount; i++) {
            const binValue = roundedMin + i * binWidth;
            binLabels.push(formatBytes(binValue));
        }

        // Fill bins
        quartileData.forEach(value => {
            // Special case for maximum value to avoid index out of bounds
            if (value >= max) {
                bins[maxBinCount - 1]++;
                return;
            }

            const binIndex = Math.min(
                Math.floor((value - roundedMin) / binWidth),
                maxBinCount - 1
            );

            if (binIndex >= 0) {
                bins[binIndex]++;
            }
        });

        return { bins, binLabels };
    }
}

export function ResponseSize({ data }: { data: Data }) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [chartData, setChartData] = useState<any>(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!data.length) {
            setStats(null);
            setChartData(null);
            return;
        }

        // Extract response sizes
        const responseSizes = data.map(row => row.responseSize || 0);

        const min = Math.min(...responseSizes);
        const max = Math.max(...responseSizes);
        const total = responseSizes.reduce((sum, size) => sum + size, 0);
        const avg = total / responseSizes.length;

        setStats({ min, avg, max });

        // Generate histogram data
        const { bins, binLabels } = generateHistogramData(responseSizes);

        setChartData({
            labels: binLabels,
            datasets: [
                {
                    data: bins,
                    backgroundColor: 'rgb(26, 240, 115)',
                    borderColor: 'rgb(26, 240, 115)',
                    borderWidth: 0,
                    borderRadius: 3,
                    barPercentage: 1,
                    categoryPercentage: 1,
                }
            ]
        });

    }, [data]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                // enabled: false,
            },
        },
        scales: {
            x: {
                display: false,
                grid: {
                    display: false,
                },
            },
            y: {
                display: false,
                grid: {
                    display: false,
                },
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative min-h-46 overflow-hidden">
            {/* Background histogram chart */}
            {chartData && (
                <div className="absolute bottom-[-1px] left-0 right-0" style={{ height: '60%' }}>
                    <Bar
                        ref={chartRef}
                        data={chartData}
                        options={chartOptions}
                    />
                </div>
            )}

            {/* Content overlay */}
            <h2 className="font-semibold">
                Response Size
            </h2>
            <div>
                {stats && (
                    <div className="flex mt-2 py-4">
                        <div className="flex-1 grid place-items-center">
                            <div className="px-4 py-3 rounded bg-[rgba(60,60,60,0.4)] backdrop-blur-[8px]">
                                <div>
                                    {formatBytes(stats.min)}
                                </div>
                                <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                    Min
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid place-items-center">
                            <div className="px-4 py-3 rounded bg-[rgba(60,60,60,0.4)] backdrop-blur-[8px]">
                                <div>
                                    {formatBytes(stats.avg)}
                                </div>
                                <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                    Avg
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid place-items-center">
                            <div className="px-4 py-3 rounded bg-[rgba(60,60,60,0.4)] backdrop-blur-[8px]">
                                <div>
                                    {formatBytes(stats.max)}
                                </div>
                                <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                    Max
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}