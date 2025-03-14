"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, TimeScale, Tooltip, Legend, ChartData } from "chart.js";
import { useEffect, useState, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { Data } from "../types";
import 'chartjs-adapter-date-fns';
import { Period, periodStart } from "../period";

ChartJS.register(
    BarElement,
    LinearScale,
    CategoryScale,
    TimeScale,
    Tooltip,
    Legend
);

function getDayId(date: Date) {
    if (!(date instanceof Date)) {
        throw new Error("Invalid date object");
    }

    return new Date(date).setHours(0, 0, 0, 0); // Set minutes, seconds, and milliseconds to zero
}

function getHourId(date: Date) {
    if (!(date instanceof Date)) {
        throw new Error("Invalid date object");
    }

    return new Date(date).setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to zero
}

function get5MinuteId(date: Date) {
    if (!(date instanceof Date)) {
        throw new Error("Invalid date object");
    }

    const msPer5Min = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (new Date(Math.round(date.getTime() / msPer5Min) * msPer5Min)).getTime();
}

function getMinuteId(date: Date) {
    if (!(date instanceof Date)) {
        throw new Error("Invalid date object");
    }

    return new Date(date).setSeconds(0, 0); // Changed to use setSeconds instead
}

const getStepSize = (period: Period) => {
    switch (period) {
        case '24 hours':
            return 300000; // 5 minutes
        case 'week':
            return 3600000; // hour
        default:
            return 8.64e+7; // day
    }
}

const getTimeIdGetter = (period: Period) => {
    switch (period) {
        case '24 hours':
            return get5MinuteId
        case 'week':
            return getHourId
        default:
            return getDayId
    }
}

const getTimeUnit = (period: Period) => {
    switch (period) {
        case '24 hours':
            return 'minute'
        case 'week':
            return 'hour'
        default:
            return 'day'
    }
}

const getSuccessRateLevel = (successRate: number | null) => {
    if (successRate === null) {
        return null
    }

    return Math.ceil((successRate) * 10)
}

export default function Activity({ data, period }: { data: Data, period: Period }) {
    const [plotData, setPlotData] = useState<ChartData<"bar"> | null>(null)
    const [plotOptions, setPlotOptions] = useState<object | null>(null)
    const [successRates, setSuccessRates] = useState<({ timestamp: number, value: number | null })[]>([])
    const [displayRates, setDisplayRates] = useState<({ timestamp: number, value: number | null })[]>([])
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Function to sample success rates based on container width
    const calculateDisplayRates = (rates: { timestamp: number, value: number | null }[], width: number) => {
        if (width === 0 || rates.length === 0) return rates;

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
    };

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

    // Update display rates when success rates or container width change
    useEffect(() => {
        const updatedDisplayRates = calculateDisplayRates(successRates, containerWidth);
        setDisplayRates(updatedDisplayRates);
    }, [successRates, containerWidth]);

    useEffect(() => {
        const points: { [id: string]: { requests: number; users: Set<string> } } = {};

        const getTimeId = getTimeIdGetter(period);
        for (const row of data) {
            if (!row.timestamp) {
                continue;
            }

            const userId = `${row.ipAddress}::${row.userAgent}`;
            const timeId = getTimeId(row.timestamp);

            if (points[timeId]) {
                points[timeId].requests++;
                points[timeId].users.add(userId);
            } else {
                points[timeId] = { requests: 1, users: new Set([userId]) };
            }
        }

        const values = Object.entries(points).map(([x, y]) => ({
            x: new Date(parseInt(x)),
            requests: y.requests - y.users.size,
            users: y.users.size
        }));

        setPlotData({
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
        });

        setPlotOptions({
            scales: {
                x: {
                    type: 'time',
                    display: false,
                    time: {
                        unit: getTimeUnit(period),
                    },
                    title: {
                        display: false,
                        text: 'Time'
                    },
                    grid: {
                        display: false
                    },
                    min: periodStart(period),
                    max: period === 'all time' ? undefined : new Date()
                },
                y: {
                    title: {
                        display: true,
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
                        }
                    }
                }
            }
        });
    }, [data, period]);

    const getSuccessRateTitle = (successRate: { timestamp: number, value: number | null }) => {
        const time = new Date(successRate.timestamp).toLocaleString()
        if (successRate.value === null) {
            return `No requests\n${time}`
        }

        return `Success rate: ${((successRate.value === 0 || successRate.value === 1) ? (successRate.value * 100).toFixed(0) : (successRate.value * 100).toFixed(1))}%\n${time}`;
    }

    const getDateRange = (data: Data) => {
        if (!data || data.length === 0) {
            return null; // Handle empty or null input
        }

        const range = { start: Infinity, end: -Infinity }

        for (const row of data) {
            if (!row.timestamp) {
                continue
            }
            const time = row.timestamp.getTime()
            if (time < range.start) {
                range.start = time;
            }
            if (time > range.end) {
                range.end = time
            }
        }

        return range;
    }

    useEffect(() => {
        const points: { [id: string]: { success: number, total: number } } = {}

        const start = periodStart(period);
        const getTimeId = getTimeIdGetter(period);
        if (start !== null) {
            const now = new Date();
            const stepSize = getStepSize(period);
            for (let i = getTimeId(start); i < now.getTime(); i += stepSize) {
                points[i] = { success: 0, total: 0 }
            }
        } else {
            const range = getDateRange(data);
            if (!range) {
                return;
            }
            const start = getTimeId(new Date(range.start))
            const end = getTimeId(new Date(range.end));
            const stepSize = getStepSize(period);
            for (let i = start; i < end; i += stepSize) {
                points[i] = { success: 0, total: 0 }
            }
        }

        for (const row of data) {
            if (!row.timestamp) {
                continue;
            }

            const timeId = getTimeId(row.timestamp);

            if (!row.status) {
                continue;
            }
            const success = row.status >= 200 && row.status <= 399;

            if (!points[timeId]) {
                points[timeId] = { success: 0, total: 0 }
            }
            if (success) {
                points[timeId].success++
            }
            points[timeId].total++
        }

        const values = Object.entries(points).sort(([timeId1, _], [timeId2, __]) => Number(timeId2) - Number(timeId1)).map(([timeId, value]) => ({ timestamp: Number(timeId), value: value.total ? value.success / value.total : null })).reverse()

        setSuccessRates(values);
    }, [data, period]);

    return (
        <div className="card flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Activity
            </h2>

            <div className="relative w-full h-full pt-2" style={{ height: '200px' }}>
                {plotData && plotOptions && <Bar
                    data={plotData}
                    options={plotOptions}
                />}
            </div>

            <div className="pb-0 pt-2" ref={containerRef}>
                <div className="flex ml-[66px] mt-2 mb-2 overflow-hidden">
                    {displayRates?.map((successRate, index) => (
                        <div
                            key={index}
                            className={`flex-1 h-12 mx-[0.5px] rounded-[2px] ${successRate.value === null ? 'level-none' : 'level-' + getSuccessRateLevel(successRate.value)}`}
                            title={getSuccessRateTitle(successRate)}
                        >
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}