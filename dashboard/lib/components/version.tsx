"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, ActiveElement } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useMemo, useRef, memo } from "react";
import { labelColor, dimColor } from "@/lib/colors";

ChartJS.register(ArcElement, Tooltip, Legend);

export { getVersion } from '@/lib/get-version';

export const Version = memo(function Version({
    versionCounts,
    filterVersion,
    setFilterVersion,
}: {
    versionCounts: Record<string, number>;
    filterVersion: string | null;
    setFilterVersion: (version: string | null) => void;
}) {
    const allLabelsRef = useRef<string[]>([]);
    const { plotData, legendItems } = useMemo<{
        plotData: ChartData<"doughnut"> | null;
        legendItems: Array<{ label: string; color: string }>;
    }>(() => {
        const labels = Object.keys(versionCounts);
        if (labels.length <= 1 && filterVersion === null) return { plotData: null, legendItems: [] };
        if (filterVersion === null) allLabelsRef.current = labels;
        const referenceLabels = allLabelsRef.current.length > 0 ? allLabelsRef.current : labels;
        const values = Object.values(versionCounts);
        const backgroundColor = labels.map((label) => {
            const color = labelColor(label, referenceLabels);
            return filterVersion && filterVersion !== label ? dimColor(color) : color;
        });
        return {
            plotData: {
                labels,
                datasets: [{ label: "Version", data: values, backgroundColor, hoverOffset: 4, borderWidth: 0 }],
            },
            legendItems: labels.map((label, index) => ({ label, color: backgroundColor[index] })),
        };
    }, [versionCounts, filterVersion]);

    const options = useMemo(() => ({
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
            const index = elements[0]?.index;
            const version = index === undefined ? undefined : plotData?.labels?.[index];
            if (typeof version === 'string') setFilterVersion(filterVersion === version ? null : version);
        },
        plugins: {
            legend: { display: false },
        },
        responsive: true,
        maintainAspectRatio: false
    }), [filterVersion, plotData, setFilterVersion]);

    return (
        <>
            {plotData && (
                <div className="card flex-1 px-4 py-3 m-3">
                    <h2 className="font-semibold">Version</h2>

                    <div className="relative w-full h-40 mt-2 flex items-center justify-center gap-3" >
                        <div className="h-full flex-1 min-w-0">
                            <Doughnut data={plotData} options={options} />
                        </div>
                        <div className="h-full w-28 shrink-0 overflow-hidden text-xs text-[var(--text-muted3)]">
                            {legendItems.slice(0, 10).map(({ label, color }) => (
                                <button
                                    key={label}
                                    className="flex w-full items-center gap-1.5 truncate py-[1px] text-left hover:text-[var(--text)] cursor-pointer"
                                    onClick={() => setFilterVersion(filterVersion === label ? null : label)}
                                    title={label}
                                >
                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="truncate">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});
