"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, LegendItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { NginxLog } from "../../types";
import { useMemo, memo } from "react";
import {
    type Candidate,
    maintainCandidates,
} from '../../candidates';
import { DONUT_COLORS, dimColor } from '../../colors';

ChartJS.register(ArcElement, Tooltip, Legend);

const deviceCandidates: Candidate[] = [
    { name: 'iPhone', regex: /iPhone/, matches: 0 },
    { name: 'Android', regex: /Android/, matches: 0 },
    { name: 'Samsung', regex: /Tizen\//, matches: 0 },
    { name: 'Mac', regex: /Macintosh/, matches: 0 },
    { name: 'Windows', regex: /Windows/, matches: 0 },
];

export function getDevice(userAgent: string | null): string {
    if (userAgent === null) {
        return 'Unknown';
    }

    for (let i = 0; i < deviceCandidates.length; i++) {
        const candidate = deviceCandidates[i];
        if (userAgent.match(candidate.regex)) {
            candidate.matches++;
            // Ensure deviceCandidates remains sorted by matches desc for future hits
            maintainCandidates(i, deviceCandidates);
            return candidate.name;
        }
    }

    return 'Other';
}

export const DeviceType = memo(function DeviceType({
    data,
    filterDeviceType,
    setFilterDeviceType,
}: {
    data: NginxLog[];
    filterDeviceType: string | null;
    setFilterDeviceType: (deviceType: string | null) => void;
}) {
    const plotData = useMemo<ChartData<"doughnut"> | null>(() => {
        const deviceCounts: { [key: string]: number } = {};

        for (const row of data) {
            const device = getDevice(row.userAgent)
            if (!deviceCounts[device]) {
                deviceCounts[device] = 0
            }
            deviceCounts[device]++;
        }

        const labels = Object.keys(deviceCounts);
        const values = Object.values(deviceCounts);

        const backgroundColor = labels.map((label, i) => {
            const color = DONUT_COLORS[i % DONUT_COLORS.length];
            return filterDeviceType && filterDeviceType !== label ? dimColor(color) : color;
        });

        return {
            labels,
            datasets: [
                {
                    label: "Count",
                    data: values,
                    backgroundColor,
                    hoverOffset: 4,
                    borderWidth: 0,
                },
            ],
        };
    }, [data, filterDeviceType]);

    const options = useMemo(() => ({
        plugins: {
            legend: {
                position: 'right' as const,
                align: 'center' as const,
                onClick: (_event: ChartEvent, item: LegendItem) => {
                    const deviceType = item.text as string;
                    setFilterDeviceType(filterDeviceType === deviceType ? null : deviceType);
                },
            },
        },
        responsive: true,
        maintainAspectRatio: false
    }), [filterDeviceType, setFilterDeviceType]);

    return (
        <div className="relative w-full flex items-center justify-center pb-4" >
            {plotData && <Doughnut data={plotData} options={options} />}
        </div>
    );
})
