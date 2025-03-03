"use client";

import { Chart as ChartJS, BarElement, LinearScale, CategoryScale } from "chart.js";
import { useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { Data } from "../types";

ChartJS.register(BarElement, LinearScale, CategoryScale);

export default function Activity({ data }: { data: Data }) {
    useEffect(() => {
        console.log(data);
    }, [data])

    return (
        <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
            <h2 className="font-semibold">
                Activity
            </h2>

            <div className="pb-0">
                <Bar
                    data={{
                        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                        datasets: [{
                            label: '# of Votes',
                            data: [12, 19, 3, 5, 2, 3],
                            borderWidth: 1
                        }]
                    }}
                    options={{
                        maintainAspectRatio: false,
                        responsive: true

                    }}
                    height={200} />
            </div>
        </div>
    )
}