"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, TimeScale, Tooltip, Legend, ChartData } from "chart.js";
import { useEffect, useMemo, useState, useRef, memo } from "react";
import { Bar } from "react-chartjs-2";
import 'chartjs-adapter-date-fns';
import { Period, periodStart } from "@/lib/period";

ChartJS.register(
    BarElement,
    LinearScale,
    CategoryScale,
    TimeScale,
    Tooltip,
    Legend
);

const getSuccessRateLevel = (successRate: number | null) => {
    if (successRate === null) return null;
    if (successRate === 0) return 1;
    return Math.ceil(successRate * 10);
};

function calculateDisplayRates(rates: { timestamp: number; value: number | null }[], width: number) {
    if (width === 0 || rates.length === 0) return rates;
    const maxDivs = Math.floor(width / 3);
    if (rates.length <= maxDivs) return rates;
    const sampleStep = Math.ceil(rates.length / maxDivs);
    const sampled = [];
    for (let i = 0; i < rates.length; i += sampleStep) sampled.push(rates[i]);
    if (sampled.length > 0 && sampled[sampled.length - 1] !== rates[rates.length - 1]) {
        sampled.push(rates[rates.length - 1]);
    }
    return sampled;
}

function Activity({
    activityBuckets,
    activityRateBuckets,
    timeUnit,
    step,
    periodLabels,
    period,
}: {
    activityBuckets:     Array<{ ts: number; req: number; users: number }>;
    activityRateBuckets: Array<{ ts: number; success: number; total: number }>;
    timeUnit:            'minute' | 'hour' | 'day';
    step:                number;
    periodLabels:        { start: string; end: string };
    period:              Period;
}) {
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth - 66);
        };
        updateWidth();
        const ro = new ResizeObserver(() => window.requestAnimationFrame(updateWidth));
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', updateWidth);
        return () => {
            if (containerRef.current) ro.unobserve(containerRef.current);
            window.removeEventListener('resize', updateWidth);
        };
    }, []);

    const { plotData, plotOptions, successRates } = useMemo(() => {
        if (activityBuckets.length === 0) {
            return { plotData: null, plotOptions: null, successRates: [] };
        }

        const plotData: ChartData<"bar"> = {
            datasets: [
                {
                    label: 'Users',
                    data: activityBuckets.map(({ ts, users }) => ({ x: new Date(ts), y: users })) as any,
                    backgroundColor: '#00bfff',
                    borderWidth: 0,
                    borderRadius: 4,
                    stack: 'stack1',
                },
                {
                    label: 'Requests',
                    data: activityBuckets.map(({ ts, req, users }) => ({ x: new Date(ts), y: req - users })) as any,
                    backgroundColor: 'rgb(26, 240, 115)',
                    borderWidth: 0,
                    borderRadius: 4,
                    stack: 'stack1',
                },
            ],
        };

        // Match the original: only set an explicit max so the chart doesn't extend
        // past "now" for fixed periods. min is left to Chart.js auto-range — its
        // default bar-chart offset (half an interval at each end) then aligns the
        // first and last bars with the edges of the success-rate strip below.
        const xMax = period === 'all time' ? undefined : Math.floor(Date.now() / step) * step;

        const plotOptions: object = {
            scales: {
                x: { type: 'time', display: false, grid: { display: false }, max: xMax },
                y: { display: false, title: { text: 'Requests' }, min: 0, stacked: true },
            },
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context: any) {
                            const label = context.dataset.label || '';
                            const value = context.raw.y;
                            if (label === 'Users') {
                                const requests = context.chart.data.datasets[1].data[context.dataIndex].y + value;
                                return ` ${value.toLocaleString()} users from ${requests.toLocaleString()} requests`;
                            } else if (label === 'Requests') {
                                const users = context.chart.data.datasets[0].data[context.dataIndex].y;
                                return ` ${(value + users).toLocaleString()} requests`;
                            }
                        },
                    },
                },
            },
        };

        const successRates = activityRateBuckets.map(({ ts, success, total }) => ({
            timestamp: ts,
            value: total > 0 ? success / total : null,
        }));

        return { plotData, plotOptions, successRates };
    }, [activityBuckets, activityRateBuckets, step, period]);

    const displayRates = useMemo(
        () => calculateDisplayRates(successRates, containerWidth),
        [successRates, containerWidth],
    );

    const getSuccessRateTitle = (sr: { timestamp: number; value: number | null }) => {
        const time = new Date(sr.timestamp).toLocaleString();
        if (sr.value === null) return `No requests\n${time}`;
        const pct = (sr.value === 0 || sr.value === 1)
            ? `${(sr.value * 100).toFixed(0)}%`
            : `${(sr.value * 100).toFixed(1)}%`;
        return `Success rate: ${pct}\n${time}`;
    };

    return (
        <div className="card flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">Activity</h2>

            <div className="relative w-full h-[200px] pt-2">
                {plotData && plotOptions ? (
                    <Bar data={plotData} options={plotOptions} />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-sm text-[var(--text-muted3)]">
                        No data
                    </div>
                )}
            </div>

            <div className="pb-0 pt-2" ref={containerRef}>
                <div className="flex ml-[0] mt-2 mb-2 overflow-hidden">
                    {displayRates?.map((sr, index) => (
                        <div
                            key={index}
                            className={`flex-1 h-12 mx-[0.5px] rounded-[2px] ${sr.value === null ? 'level-none' : 'level-' + getSuccessRateLevel(sr.value)}`}
                            title={getSuccessRateTitle(sr)}
                            suppressHydrationWarning
                        />
                    ))}
                </div>
            </div>

            <div className="pb-0">
                <div className="flex justify-between mt-2 mb-1 overflow-hidden text-xs text-[var(--text-muted3)] mx-1">
                    <div>{periodLabels.start}</div>
                    <div>{periodLabels.end}</div>
                </div>
            </div>
        </div>
    );
}

export default memo(Activity);
