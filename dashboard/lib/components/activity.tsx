"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, TimeScale, Tooltip, Legend, ChartData } from "chart.js";
import { useEffect, useMemo, useState, useRef, memo } from "react";
import { Bar } from "react-chartjs-2";
import { NginxLog } from "@/lib/types";
import 'chartjs-adapter-date-fns';
import { getDateRangeSorted, Period, periodStart } from "@/lib/period";

ChartJS.register(
    BarElement,
    LinearScale,
    CategoryScale,
    TimeScale,
    Tooltip,
    Legend
);

// All bucket-ID functions take a numeric timestamp (epoch ms) and return the
// epoch ms of the start of the containing bucket — pure integer arithmetic,
// no Date object allocation.
function getDayId(ts: number) {
    return Math.floor(ts / 86400000) * 86400000;
}

function getHourId(ts: number) {
    return Math.floor(ts / 3600000) * 3600000;
}

function get6HourId(ts: number) {
    const ms6h = 6 * 3600000;
    return Math.floor(ts / ms6h) * ms6h;
}

function get5MinuteId(ts: number) {
    return Math.floor(ts / 300000) * 300000;
}

function getMinuteId(ts: number) {
    return Math.floor(ts / 60000) * 60000;
}

const getStepSize = (period: Period, range: { start: number; end: number } | null) => {
    switch (period) {
        case '24 hours':
            return 300000; // 5 minutes
        case 'week':
            return 3600000; // 1 hour
        case 'month':
            return 21600000; // 6 hours
        case '6 months':
            return 86400000; // 1 day
        case 'all time': {
            if (!range) return 8.64e+7; // day
            const diff = range.end - range.start;
            if (diff <= 86400000) return 300000; // 5 minutes
            if (diff <= 604800000) return 3600000; // hour
            return 8.64e+7; // day
        }
        default:
            return 8.64e+7; // day
    }
}


const getTimeIdGetter = (period: Period, range: { start: number; end: number } | null) => {
    switch (period) {
        case '24 hours':
            return get5MinuteId
        case 'week':
            return getHourId
        case 'month':
            return get6HourId
        case '6 months':
            return getDayId
        case 'all time': {
            if (!range) return getDayId;
            const diff = range.end - range.start;
            if (diff <= 86400000) return get5MinuteId;
            if (diff <= 604800000) return getHourId;
            return getDayId;
        }
        default:
            return getDayId
    }
}

const getTimeUnit = (period: Period, range: { start: number; end: number } | null) => {
    switch (period) {
        case '24 hours':
            return 'minute'
        case 'week':
            return 'hour'
        case 'month':
            return 'hour'
        case '6 months':
            return 'day'
        case 'all time': {
            if (!range) return 'day';
            const diff = range.end - range.start;
            if (diff <= 86400000) return 'minute';
            if (diff <= 604800000) return 'hour';
            return 'day';
        }
        default:
            return 'day'
    }
}

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

function Activity({ data, period }: { data: NginxLog[], period: Period }) {
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

    // Single pass over data to compute chart data, success rates, and period labels
    const { plotData, plotOptions, successRates, periodLabels } = useMemo(() => {
        const chartPoints: { [id: string]: { requests: number; users: Set<string> } } = {};
        const ratePoints: { [id: string]: { success: number, total: number } } = {};

        const start = periodStart(period);
        // Compute date range once for "all time" — O(1) since data is sorted
        const range = start === null ? getDateRangeSorted(data) : null;
        const getTimeId = getTimeIdGetter(period, range);

        if (start === null && !range) {
            return { plotData: null, plotOptions: null, successRates: [], periodLabels: { start: '', end: '' } };
        }

        const startMs = start !== null ? start : range!.start;
        const endMs = start !== null ? Date.now() : range!.end;
        const step = getStepSize(period, range);

        for (let t = getTimeId(startMs); t <= getTimeId(endMs); t += step) {
            chartPoints[t] = { requests: 0, users: new Set() };
            ratePoints[t] = { success: 0, total: 0 };
        }

        // Single loop over data for both chart points and success rates
        for (const row of data) {
            if (!row.timestamp) continue;

            const timeId = getTimeId(row.timestamp);
            const userId = `${row.ipAddress}::${row.userAgent}`;

            if (chartPoints[timeId]) {
                chartPoints[timeId].requests++;
                chartPoints[timeId].users.add(userId);
            } else {
                chartPoints[timeId] = { requests: 1, users: new Set([userId]) };
            }

            if (row.status) {
                if (!ratePoints[timeId]) {
                    ratePoints[timeId] = { success: 0, total: 0 };
                }
                if (row.status >= 200 && row.status <= 399) {
                    ratePoints[timeId].success++;
                }
                ratePoints[timeId].total++;
            }
        }

        const values = Object.entries(chartPoints).map(([x, y]) => ({
            x: new Date(parseInt(x)),
            requests: y.requests - y.users.size,
            users: y.users.size
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

        const plotOptions: object = {
            scales: {
                x: {
                    type: 'time',
                    display: false,
                    grid: {
                        display: false
                    },
                    max: period === 'all time' ? undefined : getTimeId(Date.now())
                },
                y: {
                    display: false,
                    title: {
                        text: 'Requests'
                    },
                    min: 0,
                    stacked: true
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
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

        const successRates = Object.entries(ratePoints)
            .sort(([t1], [t2]) => Number(t2) - Number(t1))
            .map(([timeId, value]) => ({
                timestamp: Number(timeId),
                value: value.total ? value.success / value.total : null
            }))
            .reverse();

        let periodLabels = { start: '', end: '' };
        switch (period) {
            case '24 hours':
                periodLabels = { start: '24 hours ago', end: 'Now' };
                break;
            case 'week':
                periodLabels = { start: 'One week ago', end: 'Now' };
                break;
            case 'month':
                periodLabels = { start: 'One month ago', end: 'Now' };
                break;
            case '6 months':
                periodLabels = { start: 'Six months ago', end: 'Now' };
                break;
            default: {
                if (range) {
                    periodLabels = {
                        start: new Date(range.start).toLocaleDateString(),
                        end: new Date(range.end).toLocaleDateString()
                    };
                }
                break;
            }
        }

        return { plotData, plotOptions, successRates, periodLabels };
    }, [data, period]);

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
                    <div>{periodLabels.start}</div>
                    <div>{periodLabels.end}</div>
                </div>
            </div>
        </div>
    )
}

export default memo(Activity);
