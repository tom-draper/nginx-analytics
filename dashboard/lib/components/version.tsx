"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, LegendItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useMemo, memo } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

export { getVersion } from '@/lib/get-version';

const COLORS = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
];

function dimColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.25)`;
}

export const Version = memo(function Version({
    versionCounts,
    filterVersion,
    setFilterVersion,
}: {
    versionCounts: Record<string, number>;
    filterVersion: string | null;
    setFilterVersion: (version: string | null) => void;
}) {
    const plotData = useMemo<ChartData<"doughnut"> | null>(() => {
        const labels = Object.keys(versionCounts);
        if (labels.length <= 1 && filterVersion === null) return null;
        const values = Object.values(versionCounts);
        const backgroundColor = labels.map((label, i) => {
            const color = COLORS[i % COLORS.length];
            return filterVersion && filterVersion !== label ? dimColor(color) : color;
        });
        return {
            labels,
            datasets: [{ label: "Version", data: values, backgroundColor, hoverOffset: 4, borderWidth: 0 }],
        };
    }, [versionCounts, filterVersion]);

    const options = useMemo(() => ({
        plugins: {
            legend: {
                position: 'right' as const,
                align: 'center' as const,
                onClick: (_event: ChartEvent, item: LegendItem) => {
                    const version = item.text as string;
                    setFilterVersion(filterVersion === version ? null : version);
                },
            },
        },
        responsive: true,
        maintainAspectRatio: false
    }), [filterVersion, setFilterVersion]);

    return (
        <>
            {plotData && (
                <div className="card flex-1 px-4 py-3 m-3">
                    <h2 className="font-semibold">Version</h2>

                    <div className="relative w-full flex items-center justify-center pb-4" >
                        <Doughnut data={plotData} options={options} />
                    </div>
                </div>
            )}
        </>
    );
});
