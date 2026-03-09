"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, LegendItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useMemo, memo } from "react";
import { DONUT_COLORS, dimColor } from '../../colors';
import { getOS } from '@/lib/get-device-info';
export { getOS };

ChartJS.register(ArcElement, Tooltip, Legend);

export const OS = memo(function OS({
    osCounts,
    filterOS,
    setFilterOS,
}: {
    osCounts: Record<string, number>;
    filterOS: string | null;
    setFilterOS: (os: string | null) => void;
}) {
    const plotData = useMemo<ChartData<"doughnut"> | null>(() => {
        const labels = Object.keys(osCounts);
        const values = Object.values(osCounts);
        if (labels.length === 0) return null;
        const backgroundColor = labels.map((label, i) => {
            const color = DONUT_COLORS[i % DONUT_COLORS.length];
            return filterOS && filterOS !== label ? dimColor(color) : color;
        });
        return {
            labels,
            datasets: [{ label: "Count", data: values, backgroundColor, hoverOffset: 4, borderWidth: 0 }],
        };
    }, [osCounts, filterOS]);

    const options = useMemo(() => ({
        plugins: {
            legend: {
                position: 'right' as const,
                align: 'center' as const,
                onClick: (_event: ChartEvent, item: LegendItem) => {
                    const os = item.text as string;
                    setFilterOS(filterOS === os ? null : os);
                },
            },
        },
        responsive: true,
        maintainAspectRatio: false
    }), [filterOS, setFilterOS]);

    return (
        <div className="relative w-full flex items-center justify-center pb-4" >
            {plotData && <Doughnut data={plotData} options={options} />}
        </div>
    );
})
