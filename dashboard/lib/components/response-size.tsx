import { useMemo, useRef, memo } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Histogram = {
    bins: number[];
    binLabels: string[];
    min: number;
    avg: number;
    max: number;
};

function formatBytes(bytes: number) {
    if (bytes === 0) {
        return '0 Bytes';
    }

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i)) + ' ' + (sizes[i] || 'Bytes');
}

// Static — no props/state, no reason to recreate on every render
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

export const ResponseSize = memo(function ResponseSize({ histogram }: { histogram: Histogram | null }) {
    const chartRef = useRef(null);

    const chartData = useMemo(() => {
        if (!histogram || histogram.bins.length === 0) return null;
        return {
            labels: histogram.binLabels,
            datasets: [{ data: histogram.bins, backgroundColor: 'rgb(26, 240, 115)', borderColor: 'rgb(26, 240, 115)', borderWidth: 0, borderRadius: 3, barPercentage: 1, categoryPercentage: 1 }]
        };
    }, [histogram]);

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative min-h-46 overflow-hidden">
            {/* Background histogram chart */}
            {chartData && (
                <div className="absolute bottom-[-1px] left-0 right-0 z-10 h-[40%]" style={{ display: chartData.datasets[0].data.length > 1 ? 'block' : 'none' }}>
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
                {histogram && (
                    <div className="flex mt-2 py-4">
                        <div className="flex-1 grid place-items-center">
                            <div className="px-4 py-3 rounded bg-[rgba(46,46,46,0.6)] backdrop-blur-[8px]">
                                <div>
                                    {formatBytes(histogram.min)}
                                </div>
                                <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                    Min
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid place-items-center">
                            <div className="px-4 py-3 rounded bg-[rgba(46,46,46,0.6)] backdrop-blur-[8px]">
                                <div>
                                    {formatBytes(histogram.avg)}
                                </div>
                                <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                    Avg
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid place-items-center">
                            <div className="px-4 py-3 rounded bg-[rgba(46,46,46,0.6)] backdrop-blur-[8px]">
                                <div>
                                    {formatBytes(histogram.max)}
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
});
