"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, ActiveElement } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useMemo, useRef, memo } from "react";
import { labelColor, dimColor } from '../../colors';
import { getClient } from '@/lib/get-device-info';
export { getClient };

ChartJS.register(ArcElement, Tooltip, Legend);

export const Client = memo(function Client({
    clientCounts,
    filterClient,
    setFilterClient,
}: {
    clientCounts: Record<string, number>;
    filterClient: string | null;
    setFilterClient: (client: string | null) => void;
}) {
    const allLabelsRef = useRef<string[]>([]);
    const { plotData, legendItems } = useMemo<{
        plotData: ChartData<"doughnut"> | null;
        legendItems: Array<{ label: string; color: string }>;
    }>(() => {
        const labels = Object.keys(clientCounts);
        const values = Object.values(clientCounts);
        if (labels.length === 0) return { plotData: null, legendItems: [] };
        if (filterClient === null) allLabelsRef.current = labels;
        const referenceLabels = allLabelsRef.current.length > 0 ? allLabelsRef.current : labels;
        const backgroundColor = labels.map((label) => {
            const color = labelColor(label, referenceLabels);
            return filterClient && filterClient !== label ? dimColor(color) : color;
        });
        return {
            plotData: {
                labels,
                datasets: [{ label: "Count", data: values, backgroundColor, hoverOffset: 4, borderWidth: 0 }],
            },
            legendItems: labels.map((label, index) => ({ label, color: backgroundColor[index] })),
        };
    }, [clientCounts, filterClient]);

    const options = useMemo(() => ({
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
            const index = elements[0]?.index;
            const client = index === undefined ? undefined : plotData?.labels?.[index];
            if (typeof client === 'string') setFilterClient(filterClient === client ? null : client);
        },
        plugins: {
            legend: { display: false },
        },
        responsive: true,
        maintainAspectRatio: false
    }), [filterClient, plotData, setFilterClient]);

    return (
        <div className="relative w-full h-40 mt-2 flex items-center justify-center gap-3" >
            <div className="h-full flex-1 min-w-0">
                {plotData && <Doughnut data={plotData} options={options} />}
            </div>
            <div className="h-full w-28 shrink-0 overflow-hidden text-xs text-[var(--text-muted3)]">
                {legendItems.slice(0, 10).map(({ label, color }) => (
                    <button
                        key={label}
                        className="flex w-full items-center gap-1.5 truncate py-[1px] text-left hover:text-[var(--text)] cursor-pointer"
                        onClick={() => setFilterClient(filterClient === label ? null : label)}
                        title={label}
                    >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="truncate">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
})
