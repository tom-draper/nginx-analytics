"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { NginxLog } from "../types";
import { useEffect, useState } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

function getVersion(endpoint: string): string | null {
    if (!endpoint) {
        return null;
    }

    const match = endpoint.match(/\/(v\d+)\//);
    console.log(endpoint, match)
    if (!match) {
        return null;
    }

    return match[1];
}

export function Version({ data }: { data: NginxLog[] }) {
    const [plotData, setPlotData] = useState<ChartData<"doughnut"> | null>(null);

    useEffect(() => {
        const versionCounts: { [key: string]: number } = {};

        for (const row of data) {
            const version = getVersion(row.path)
            if (!version) {
                continue;
            }

            if (!versionCounts[version]) {
                versionCounts[version] = 1
            } else {
                versionCounts[version]++;
            }
        }

        const labels = Object.keys(versionCounts);
        if (labels.length <= 1) {
            setPlotData(null);
            return;
        }
        const values = Object.values(versionCounts);

        setPlotData({
            labels,
            datasets: [
                {
                    label: "Version",
                    data: values,
                    backgroundColor: [
                        "#FF6384",
                        "#36A2EB",
                        "#FFCE56",
                        "#4BC0C0",
                        "#9966FF",
                        "#FF9F40",
                    ],
                    hoverOffset: 4,
                    borderWidth: 0,
                },
            ],
        });
    }, [data]);

    return (
        <>
            {plotData && (
                <div className="card flex-1 px-4 py-3 m-3">
                    <h2 className="font-semibold">Version</h2>

                    <div className="relative w-full flex items-center justify-center pb-4" >
                        <Doughnut data={plotData} options={{
                            plugins: {
                                legend: {
                                    position: 'right', // Moves legend to the right side
                                    align: 'center',
                                },
                            },
                            responsive: true,
                            maintainAspectRatio: false
                        }} />
                    </div>
                </div>
            )}
        </>
    );
}
