"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, LegendItem } from "chart.js";
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
    const plotData = useMemo<ChartData<"doughnut"> | null>(() => {
        const labels = Object.keys(clientCounts);
        const values = Object.values(clientCounts);
        if (labels.length === 0) return null;
        if (filterClient === null) allLabelsRef.current = labels;
        const referenceLabels = allLabelsRef.current.length > 0 ? allLabelsRef.current : labels;
        const backgroundColor = labels.map((label) => {
            const color = labelColor(label, referenceLabels);
            return filterClient && filterClient !== label ? dimColor(color) : color;
        });
        return {
            labels,
            datasets: [{ label: "Count", data: values, backgroundColor, hoverOffset: 4, borderWidth: 0 }],
        };
    }, [clientCounts, filterClient]);

    const options = useMemo(() => ({
        plugins: {
            legend: {
                position: 'right' as const,
                align: 'center' as const,
                onClick: (_event: ChartEvent, item: LegendItem) => {
                    const client = item.text as string;
                    setFilterClient(filterClient === client ? null : client);
                },
            },
        },
        responsive: true,
        maintainAspectRatio: false
    }), [filterClient, setFilterClient]);

    return (
        <div className="relative w-full h-40 mt-2 flex items-center justify-center" >
            {plotData && <Doughnut data={plotData} options={options} />}
        </div>
    );
})
