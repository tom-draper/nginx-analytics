"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, TimeScale, Tooltip, Legend, ChartData } from "chart.js";
import { useEffect, useMemo, useState, useRef, memo } from "react";
import { Bar } from "react-chartjs-2";
import 'chartjs-adapter-date-fns';
import { Period } from "@/lib/period";

ChartJS.register(
    BarElement,
    LinearScale,
    CategoryScale,
    TimeScale,
    Tooltip,
    Legend
);

const getSuccessRateLevel = (successRate: number | null) => {
    if (successRate === null) {
        return null
    }

    if (successRate === 0) {
        return 1;
    }

    return Math.ceil((successRate) * 10)
}

// Pure function — lives outside the component so it's not recreated on every render
function calculateDisplayRates(rates: { timestamp: number, value: number | null }[], width: number) {
    if (width === 0 || rates.length === 0) {
        return rates;
    }

    // Calculate how many divs we can fit based on container width
    // Assume each div needs minimum 3px (2px + 0.5px margin on each side)
    const minDivWidth = 3;
    const maxDivs = Math.floor(width / minDivWidth);

    // If we have fewer success rates than maxDivs, display all of them
    if (rates.length <= maxDivs) {
        return rates;
    }

    // Otherwise, sample the data to fit the container
    const sampleStep = Math.ceil(rates.length / maxDivs);
    const sampled = [];

    for (let i = 0; i < rates.length; i += sampleStep) {
        sampled.push(rates[i]);
    }

    // Always include the most recent data point if it's not already included
    if (sampled.length > 0 && rates.length > 0 &&
        sampled[sampled.length - 1] !== rates[rates.length - 1]) {
        sampled.push(rates[rates.length - 1]);
    }

    return sampled;
}

function Activity({
    period,
    activityBuckets,
    activitySuccessRates,
    activityPeriodLabels,
    activityStepSize,
    activityTimeUnit,
}: {
    period: Period;
    activityBuckets: { timestamp: number; requests: number; users: number }[];
    activitySuccessRates: { timestamp: number; successRate: number | null }[];
    activityPeriodLabels: { start: string; end: string };
    activityStepSize: number;
    activityTimeUnit: 'minute' | 'hour' | 'day';
}) {
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth - 66);
            }
        };

        // Initial measurement
        updateWidth();

        // Create ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(updateWidth);
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        // Also listen for window resize events as a fallback
        window.addEventListener('resize', updateWidth);

        // Clean up
        return () => {
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
            window.removeEventListener('resize', updateWidth);
        };
    }, []); // Remove containerWidth from dependencies to prevent circular updates

    const { plotData, plotOptions, successRates } = useMemo(() => {
        if (activityBuckets.length === 0) {
            return { plotData: null, plotOptions: null, successRates: [] };
        }

        const values = activityBuckets.map(b => ({
            x: new Date(b.timestamp),
            requests: b.requests,
            users: b.users,
        }));

        const plotData: ChartData<"bar"> = {
            datasets: [
                {
                    label: 'Users',
                    data: values.map(v => ({ x: v.x, y: v.users })) as any,
                    backgroundColor: '#00bfff',
                    borderWidth: 0,
                    borderRadius: 4,
                    stack: 'stack1',
                },
                {
                    label: 'Requests',
                    data: values.map(v => ({ x: v.x, y: v.requests })) as any,
                    backgroundColor: 'rgb(26, 240, 115)',
                    borderWidth: 0,
                    borderRadius: 4,
                    stack: 'stack1',
                }
            ]
        };

        // For the x-axis max, we need the current time bucketed to the same granularity
        let nowId: number;
        switch (activityTimeUnit) {
            case 'minute': nowId = Math.round(Date.now() / 300000) * 300000; break;
            case 'hour': nowId = new Date().setMinutes(0, 0, 0); break;
            default: nowId = new Date().setHours(0, 0, 0, 0); break;
        }

        const plotOptions: object = {
            scales: {
                x: {
                    type: 'time',
                    display: false,
                    grid: { display: false },
                    time: { unit: activityTimeUnit, stepSize: activityStepSize },
                    max: period === 'all time' ? undefined : nowId,
                },
                y: {
                    display: false,
                    title: { text: 'Requests' },
                    min: 0,
                    stacked: true,
                }
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
                                const requests = value + users;
                                return ` ${requests.toLocaleString()} requests`;
                            }
                        },
                    }
                }
            }
        };

        const successRates = activitySuccessRates.map(r => ({
            timestamp: r.timestamp,
            value: r.successRate,
        }));

        return { plotData, plotOptions, successRates };
    }, [activityBuckets, activitySuccessRates, activityStepSize, activityTimeUnit, period]);

    // Only recalculate display rates when successRates or container width changes
    const displayRates = useMemo(
        () => calculateDisplayRates(successRates, containerWidth),
        [successRates, containerWidth]
    );

    const getSuccessRateTitle = (successRate: { timestamp: number, value: number | null }) => {
        const time = new Date(successRate.timestamp).toLocaleString()
        if (successRate.value === null) {
            return `No requests\n${time}`
        }

        return `Success rate: ${((successRate.value === 0 || successRate.value === 1) ? (successRate.value * 100).toFixed(0) : (successRate.value * 100).toFixed(1))}%\n${time}`;
    }

    return (
        <div className="card flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Activity
            </h2>

            <div className="relative w-full h-[200px] pt-2">
                {plotData && plotOptions && <Bar
                    key={activityStepSize}
                    data={plotData}
                    options={plotOptions}
                />}
            </div>

            <div className="pb-0 pt-2" ref={containerRef}>
                <div className="flex ml-[0] mt-2 mb-2 overflow-hidden">
                    {displayRates?.map((successRate, index) => (
                        <div
                            key={index}
                            className={`flex-1 h-12 mx-[0.5px] rounded-[2px] ${successRate.value === null ? 'level-none' : 'level-' + getSuccessRateLevel(successRate.value)}`}
                            title={getSuccessRateTitle(successRate)}
                            suppressHydrationWarning
                        >
                        </div>
                    ))}
                </div>
            </div>

            <div className="pb-0">
                <div className="flex justify-between mt-2 mb-1 overflow-hidden text-xs text-[var(--text-muted3)] mx-1">
                    <div>{activityPeriodLabels.start}</div>
                    <div>{activityPeriodLabels.end}</div>
                </div>
            </div>
        </div>
    )
}

export default memo(Activity);
