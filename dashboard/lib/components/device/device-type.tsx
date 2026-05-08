"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, LegendItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useMemo, useRef, memo } from "react";
import { labelColor, dimColor } from '../../colors';
import { getDevice } from '@/lib/get-device-info';
export { getDevice };

ChartJS.register(ArcElement, Tooltip, Legend);

export const DeviceType = memo(function DeviceType({
    deviceTypeCounts,
    filterDeviceType,
    setFilterDeviceType,
}: {
    deviceTypeCounts: Record<string, number>;
    filterDeviceType: string | null;
    setFilterDeviceType: (deviceType: string | null) => void;
}) {
    const allLabelsRef = useRef<string[]>([]);
    const plotData = useMemo<ChartData<"doughnut"> | null>(() => {
        const labels = Object.keys(deviceTypeCounts);
        const values = Object.values(deviceTypeCounts);
        if (labels.length === 0) return null;
        if (filterDeviceType === null) allLabelsRef.current = labels;
        const referenceLabels = allLabelsRef.current.length > 0 ? allLabelsRef.current : labels;
        const backgroundColor = labels.map((label) => {
            const color = labelColor(label, referenceLabels);
            return filterDeviceType && filterDeviceType !== label ? dimColor(color) : color;
        });
        return {
            labels,
            datasets: [{ label: "Count", data: values, backgroundColor, hoverOffset: 4, borderWidth: 0 }],
        };
    }, [deviceTypeCounts, filterDeviceType]);

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
        <div className="relative w-full h-40 mt-2 flex items-center justify-center" >
            {plotData && <Doughnut data={plotData} options={options} />}
        </div>
    );
})
