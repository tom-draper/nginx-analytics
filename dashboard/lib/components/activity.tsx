"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, TimeScale, Tooltip, Legend, ChartData } from "chart.js";
import { useEffect, useState } from "react";
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
    const [successRates, setSuccessRates] = useState<({timestamp: number, value: number | null})[]>([])

    useEffect(() => {
        const points: { [id: string]: number } = {}

        const getTimeId = getTimeIdGetter(period);
        for (const row of data) {
            if (!row.timestamp) {
                continue;
            }

            const timeId = getTimeId(row.timestamp);
            if (points[timeId]) {
                points[timeId]++
            } else {
                points[timeId] = 1
            }
        }

        const values = Object.entries(points).map(([x, y]) => ({ x: new Date(parseInt(x)), y }));

        setPlotData({
            datasets: [{
                label: '# of Requests',
                data: values,
                borderWidth: 1,
                backgroundColor: 'rgba(46, 204, 113, 1)',
                borderColor: 'rgb(46, 204, 113)',
                borderRadius: 4
            }]
        })

        setPlotOptions({
            scales: {
                x: {
                    type: 'time',
                    display: false,
                    time: {
                        unit: getTimeUnit(period),
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
                    },
                    min: periodStart(period),
                    max: new Date()
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
        const getTimeId = getTimeIdGetter(period);
        if (start !== null) {
            const now = new Date();
            const stepSize = getStepSize(period);
            for (let i = getTimeId(start); i < now.getTime(); i += stepSize) {
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

        const values = Object.entries(points).sort(([timeId1, _], [timeId2, __]) => Number(timeId2) - Number(timeId1)).map(([timeId, value]) => ({ timestamp: Number(timeId), value: value.total ? value.success / value.total : null})).reverse()

        setSuccessRates(values);
    }, [data])

    return (
        <div className="border rounded-lg border-gray-300 flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Activity
            </h2>

            <div className="relative w-full pt-2" style={{ height: '200px' }}>
                {plotData && <Bar
                    data={plotData}
                    options={{
                        ...plotOptions,
                        maintainAspectRatio: false,
                        responsive: true,
                    }}
                    style={{ width: '100%', height: '100%' }}
                />}
            </div>

            <div className="pb-0 pt-2">
                <div className="flex ml-14 mt-2 mb-2">
                    {successRates?.map((successRate, index) => (
                        <div key={index} className={`flex-1 h-12 mx-[] rounded-[1px] ${successRate.value === null ? 'level-none' : 'level-' + getSuccessRateLevel(successRate.value)}`} title={getSuccessRateTitle(successRate)}>

                        </div>
                    ))}

                </div>

            </div>
        </div>
    )
}