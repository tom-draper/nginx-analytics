"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Data } from "../../types";
import { useEffect, useState } from "react";
import {
    type Candidate,
    maintainCandidates,
} from '../../candidates';

ChartJS.register(ArcElement, Tooltip, Legend);

const deviceCandidates: Candidate[] = [
    { name: 'iPhone', regex: /iPhone/, matches: 0 },
    { name: 'Android', regex: /Android/, matches: 0 },
    { name: 'Samsung', regex: /Tizen\//, matches: 0 },
    { name: 'Mac', regex: /Macintosh/, matches: 0 },
    { name: 'Windows', regex: /Windows/, matches: 0 },
];

	function getDevice(userAgent: string | null): string {
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


export function DeviceType({ data }: { data: Data }) {
    const [plotData, setPlotData] = useState<ChartData<"doughnut"> | null>(null);

    useEffect(() => {
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

        setPlotData({
            labels,
            datasets: [
                {
                    label: "Count",
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
        <div className="relative w-full flex items-center justify-center pb-4" >
            {plotData && <Doughnut data={plotData} options={{
                plugins: {
                    legend: {
                        position: 'right', // Moves legend to the right side
                        align: 'center',
                    },
                },
                responsive: true,
                maintainAspectRatio: false
            }} />}
        </div>
    );
}
