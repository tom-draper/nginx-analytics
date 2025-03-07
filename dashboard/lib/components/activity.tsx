"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, TimeScale, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";
//@ts-expect-error tee
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

    return date.setHours(0, 0, 0, 0); // Set minutes, seconds, and milliseconds to zero
}

function getHourId(date: Date) {
    if (!(date instanceof Date)) {
        throw new Error("Invalid date object");
    }

    return date.setMinutes(0, 0, 0); // Set minutes, seconds, and milliseconds to zero
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

    return date.setSeconds(0, 0); // Changed to use setSeconds instead
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

export default function Activity({ data, period }: { data: Data, period: Period }) {
    const [requestsPlotData, setRequestsPlotData] = useState<object | null>(null)
    const [requestsPlotOptions, setRequestsPlotOptions] = useState<object | null>(null)
    const [successRates, setSuccessRates] = useState<number[] | null>(null)

    useEffect(() => {
        const points: { [id: string]: number } = {}

        for (const row of data) {
            if (!row.timestamp) continue;

            const dayId = getHourId(row.timestamp);

            if (points[dayId]) {
                points[dayId]++
            } else {
                points[dayId] = 1
            }
        }

        const values = Object.entries(points).map(([x, y]) => ({ x: new Date(parseInt(x)), y }));

        setRequestsPlotData({
            datasets: [{
                label: '# of Requests',
                data: values,
                borderWidth: 1,
                backgroundColor: 'rgba(46, 204, 113, 1)',
                borderColor: 'rgb(46, 204, 113)',
                borderRadius: 4
            }]
        })

        setRequestsPlotOptions({
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        // displayFormats: {
                        //     minute: 'HH:mm'
                        // },
                        // tooltipFormat: 'HH:mm'
                    },
                    title: {
                        display: false,
                        text: 'Time'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Requests'
                    },
                    min: 0
                }
            },
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true
                }
            }
        })
    }, [data])

    useEffect(() => {
        const points: { [id: string]: { success: number, total: number } } = {}

        const start = periodStart(period);
        if (start !== null) {
            const now = new Date();
            const stepSize = getStepSize(period);
            for (let i = start.getTime(); i < now.getTime(); i += stepSize) {
                points[i] = { success: 0, total: 0 }
            }
        }

        for (const row of data) {
            if (!row.timestamp) continue;

            const timeId = getHourId(row.timestamp);

            if (!row.status) continue;
            const success = row.status >= 200 && row.status <= 399;

            if (!points[timeId]) {
                points[timeId] = { success: 0, total: 0 }
            }
            if (success) {
                points[timeId].success++
            }
            points[timeId].total++
        }

        // const stepSize = 300000 * 60;
        // const min = Math.min(...Object.keys(points).map(Number));
        // const max = Math.max(...Object.keys(points).map(Number));
        // let timeId = min + stepSize;
        // while (true) {
        //     if (!points[timeId]) {
        //         points[timeId] = { success: 0, total: 0 }
        //     }
        //     if (timeId > max) {
        //         break
        //     }
        //     timeId += stepSize
        // }

        const values = Object.entries(points).sort(([timeId1, _], [timeId2, __]) => Number(timeId2) - Number(timeId1)).map(([_, value]) => value.total ? Math.ceil((value.success / value.total) * 10) : 0)

        setSuccessRates(values);
    }, [data])

    return (
        <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
            <h2 className="font-semibold">
                Activity
            </h2>

            <div className="relative w-full pt-2" style={{ height: '200px' }}>
                {requestsPlotData && <Bar
                    data={requestsPlotData}
                    options={{
                        ...requestsPlotOptions,
                        maintainAspectRatio: false,
                        responsive: true,
                        animation: {
                            duration: 0 // Disable animations for smoother resizing
                        }
                    }}
                    style={{ width: '100%', height: '100%' }}
                />}
            </div>

            <div className="pb-0 pt-2">
                <div className="flex ml-14 mr-2 mt-2 mb-2">
                    {successRates?.map((successRate, index) => (
                        <div key={index} className="flex-1 h-12 mx-[0.2px] level rounded-[3px]">

                        </div>
                    ))}

                </div>

            </div>
        </div>
    )
}