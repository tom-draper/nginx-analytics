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

function calculateDisplayRates(rates: { timestamp: number; value: number | null; title: string }[], width: number) {
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
    dataReady,
}: {
    activityBuckets:     Array<{ ts: number; req: number; users: number }>;
    activityRateBuckets: Array<{ ts: number; success: number; total: number }>;
    timeUnit:            'minute' | 'hour' | 'day';
    step:                number;
    periodLabels:        { start: string; end: string };
    period:              Period;
    dataReady:           boolean;
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
                    data: activityBuckets.map(({ ts, users }) => ({ x: ts, y: users })) as any,
                    backgroundColor: '#00bfff',
                    borderWidth: 0,
                    borderRadius: 4,
                    stack: 'stack1',
                },
                {
                    label: 'Requests',
                    data: activityBuckets.map(({ ts, req, users }) => ({ x: ts, y: req - users })) as any,
                    backgroundColor: 'rgb(26, 240, 115)',
                    borderWidth: 0,
                    borderRadius: 4,
                    stack: 'stack1',
                },
            ],
        };

        // For fixed periods: cap at the current bucket boundary so the chart
        // doesn't extend past "now". min is left to Chart.js auto-range — with
        // offset:true it adds half a step at each end, aligning bars with the
        // success-rate strip edges.
        // For "all time": pin min/max to the actual data extent so Chart.js's
        // offset:true adds the correct half-step padding at both edges regardless
        // of container width (fixes clipped edge bars in fullscreen).
        const xMin = period === 'all time' && activityBuckets.length > 0
            ? activityBuckets[0].ts
            : undefined;
        const xMax = period === 'all time'
            ? (activityBuckets.length > 0 ? activityBuckets[activityBuckets.length - 1].ts : undefined)
            : Math.floor(Date.now() / step) * step;

        const plotOptions: object = {
            scales: {
                x: { type: 'time', display: false, grid: { display: false }, min: xMin, max: xMax, offset: true },
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

        const successRates = activityRateBuckets.map(({ ts, success, total }) => {
            const value = total > 0 ? success / total : null;
            const time = new Date(ts).toLocaleString();
            const title = value === null
                ? `No requests\n${time}`
                : `Success rate: ${(value === 0 || value === 1) ? (value * 100).toFixed(0) : (value * 100).toFixed(1)}%\n${time}`;
            return { timestamp: ts, value, title };
        });

        return { plotData, plotOptions, successRates };
    }, [activityBuckets, activityRateBuckets, step, period]);

    const displayRates = useMemo(
        () => calculateDisplayRates(successRates, containerWidth),
        [successRates, containerWidth],
    );

    return (
        <div className="card flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">Activity</h2>

            <div className="relative w-full h-[200px] pt-2">
                {plotData && plotOptions ? (
                    <Bar data={plotData} options={plotOptions} />
                ) : dataReady ? (
                    <div className="flex items-center justify-center w-full h-full text-sm text-[var(--text-muted3)]">
                        No data
                    </div>
                ) : null}
            </div>

            <div className="pb-0 pt-2" ref={containerRef}>
                <div className="flex h-12 ml-[0] mt-2 mb-2 overflow-hidden">
                    {displayRates?.map((sr, index) => (
                        <div
                            key={index}
                            className={`flex-1 h-12 mx-[0.5px] rounded-[2px] ${sr.value === null ? 'level-none' : 'level-' + getSuccessRateLevel(sr.value)}`}
                            title={sr.title}
                            suppressHydrationWarning
                        />
                    ))}
                </div>
            </div>

            <div className="pb-0">
                <div className="flex min-h-4 justify-between mt-2 mb-1 overflow-hidden text-xs text-[var(--text-muted3)] mx-1">
                    <div>{periodLabels.start}</div>
                    <div>{periodLabels.end}</div>
                </div>
            </div>
        </div>
    );
}

export default memo(Activity);
