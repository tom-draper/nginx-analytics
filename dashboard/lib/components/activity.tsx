"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, TimeScale, Tooltip, Legend, ChartData } from "chart.js";
import { useEffect, useState, useRef } from "react";
import { Bar } from "react-chartjs-2";
import { NginxLog } from "../types";
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

const getStepSize = (period: Period, data: NginxLog[]) => {
    switch (period) {
        case '24 hours':
            return 300000; // 5 minutes
        case 'week':
            return 3600000; // hour
        case 'all time':
            const range = getDateRange(data);
            if (!range) {
                return 8.64e+7; // day
            }

            const diff = range.end - range.start;
            if (diff <= 86400000) {
                return 300000; // 5 minutes
            } else if (diff <= 604800000) {
                return 3600000; // hour
            } else {
                return 8.64e+7; // day
            }
        default:
            return 8.64e+7; // day
    }
}

const getTimeIdGetter = (period: Period, data: NginxLog[]) => {
    switch (period) {
        case '24 hours':
            return get5MinuteId
        case 'week':
            return getHourId
        case 'all time':
            const range = getDateRange(data);
            if (!range) {
                return getDayId;
            }

            const diff = range.end - range.start;
            if (diff <= 86400000) {
                return get5MinuteId;
            } else if (diff <= 604800000) {
                return getHourId;
            } else {
                return getDayId;
            }
        default:
            return getDayId
    }
}

const getTimeUnit = (period: Period, data: NginxLog[]) => {
    switch (period) {
        case '24 hours':
            return 'minute'
        case 'week':
            return 'hour'
        case 'all time':
            const range = getDateRange(data);
            if (!range) {
                return 'day';
            }

            const diff = range.end - range.start;
            if (diff <= 86400000) {
                return 'minute';
            } else if (diff <= 604800000) {
                return 'hour';
            } else {
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

const getDateRange = (data: NginxLog[]) => {
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

export default function Activity({ data, period }: { data: NginxLog[], period: Period }) {
    const [plotData, setPlotData] = useState<ChartData<"bar"> | null>(null)
    const [plotOptions, setPlotOptions] = useState<object | null>(null)
    const [successRates, setSuccessRates] = useState<({ timestamp: number, value: number | null })[]>([])
    const [displayRates, setDisplayRates] = useState<({ timestamp: number, value: number | null })[]>([])
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Function to sample success rates based on container width
    const calculateDisplayRates = (rates: { timestamp: number, value: number | null }[], width: number) => {
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

        console.log(`Sampled success rates ${rates.length} -> ${sampled.length}`);

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

        const start = periodStart(period);
        const getTimeId = getTimeIdGetter(period, data);
        const stepSize = getStepSize(period, data);
        if (start !== null) {
            const now = new Date();
            for (let i = getTimeId(start); i < now.getTime(); i += stepSize) {
                points[i] = { requests: 0, users: new Set() };
            }
        } else {
            const range = getDateRange(data);
            if (!range) {
                return;
            }
            const start = getTimeId(new Date(range.start))
            const end = getTimeId(new Date(range.end));
            for (let i = start; i <= end; i += stepSize) {
                points[i] = { requests: 0, users: new Set() };
            }
        }

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
                    // time: {
                    //     unit: getTimeUnit(period, data),
                    // },
                    // title: {
                    //     display: false,
                    //     text: 'Time'
                    // },
                    grid: {
                        display: false
                    },
                    // min: periodStart(period),
                    max: period === 'all time' ? undefined : new Date()
                },
                y: {
                    display: false,
                    title: {
                        // display: true,
                        text: 'Requests'
                    },
                    // ticks: {
                    //     padding: 20,
                    // },
                    min: 0,
                    stacked: true
                }
            },
            // layout: {
            //     left: 50,
            // },
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
        });
    }, [data, period]);

    const getSuccessRateTitle = (successRate: { timestamp: number, value: number | null }) => {
        const time = new Date(successRate.timestamp).toLocaleString()
        if (successRate.value === null) {
            return `No requests\n${time}`
        }

        return `Success rate: ${((successRate.value === 0 || successRate.value === 1) ? (successRate.value * 100).toFixed(0) : (successRate.value * 100).toFixed(1))}%\n${time}`;
    }


    useEffect(() => {
        const points: { [id: string]: { success: number, total: number } } = {}

        const start = periodStart(period);
        const getTimeId = getTimeIdGetter(period, data);
        const stepSize = getStepSize(period, data);
        if (start !== null) {
            const now = new Date();
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
            for (let i = start; i <= end; i += stepSize) {
                points[i] = { success: 0, total: 0 }
            }
        }

        for (const row of data) {
            if (!row.timestamp || !row.status) {
                continue;
            }

            const timeId = getTimeId(row.timestamp);

            if (!points[timeId]) {
                points[timeId] = { success: 0, total: 0 }
            }
            const success = row.status >= 200 && row.status <= 399;
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

            <div className="relative w-full h-[200px] pt-2">
                {plotData && plotOptions && <Bar
                    data={plotData}
                    options={plotOptions}
                />}
            </div>

            <div className="pb-0 pt-2" ref={containerRef}>
                <div className="flex ml-[66px] !ml-[0] mt-2 mb-2 overflow-hidden">
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