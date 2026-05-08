"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, LegendItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useMemo, useRef, memo } from "react";
import { labelColor, dimColor } from '../../colors';
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
    const allLabelsRef = useRef<string[]>([]);
    const plotData = useMemo<ChartData<"doughnut"> | null>(() => {
        const labels = Object.keys(osCounts);
        const values = Object.values(osCounts);
        if (labels.length === 0) return null;
        if (filterOS === null) allLabelsRef.current = labels;
        const referenceLabels = allLabelsRef.current.length > 0 ? allLabelsRef.current : labels;
        const backgroundColor = labels.map((label) => {
            const color = labelColor(label, referenceLabels);
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
        <div className="relative w-full h-40 mt-2 flex items-center justify-center" >
            {plotData && <Doughnut data={plotData} options={options} />}
        </div>
    );
})
