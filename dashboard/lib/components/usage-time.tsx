import { PolarArea } from "react-chartjs-2";
import { Data } from "../types";
import { useEffect, useState } from "react";
import { Chart as ChartJS, ChartData, RadialLinearScale, ArcElement } from "chart.js";

ChartJS.register(RadialLinearScale, ArcElement);

export default function UsageTime({ data }: { data: Data }) {
    const [plotData, setPlotData] = useState<ChartData<"polarArea"> | null>(null);
    const [plotOptions, setPlotOptions] = useState<object | null>(null);

    useEffect(() => {
        const hourCounts = new Array(24).fill(0);

        // Assuming `data` has timestamps
        for (const row of data) {
            const date = row.timestamp; // Adjust this based on your data format
            if (date === null) {
                continue;
            }
            const hour = date.getHours();
            hourCounts[hour]++;
        }

        setPlotData({
            labels: hourCounts.map((_, i) => `${i}:00`),
            datasets: [{
                label: 'Requests per Hour',
                data: hourCounts,
                backgroundColor: 'rgb(46, 204, 113)'
            }]
        });
    }, [data]);

    return (
        <div className="border rounded-lg border-gray-300 flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">Usage Time</h2>
            {plotData && <PolarArea data={plotData} options={{
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true },
                },
                layout: {
                    padding: {
                        left: 20,
                        right: 20,
                    }
                },
                responsive: true,
                maintainAspectRatio: true,
            }} />}
        </div>
    );
}
