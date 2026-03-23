'use client';

import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export const ResourceUsageChart = ({ data, timestamps, label, color, height = "h-32" }: {
    data: any;
    timestamps: any;
    label: string;
    color: string;
    height?: string;
}) => {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                display: false
            },
            y: {
                min: 0,
                max: 100,
                ticks: {
                    stepSize: 25,
                    color: 'rgba(107, 114, 128, 0.7)',
                    font: {
                        size: 10
                    }
                },
                grid: {
                    color: 'rgba(229, 231, 235, 0.3)'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                intersect: false,
                mode: 'index',
                callbacks: {
                    title: function (tooltipItems: any) {
                        return new Date(timestamps[tooltipItems[0].dataIndex]).toLocaleTimeString();
                    }
                }
            }
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 3
            },
            line: {
                tension: 0.3,
            }
        }
    };

    const chartData = {
        labels: timestamps,
        datasets: [
            {
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: `${color}20`, // 20 = 12% opacity in hex
                fill: true,
                borderWidth: 2
            }
        ]
    };

    return (
        <div className={`w-[100%] ${height}`}>
            <Line options={chartOptions as any} data={chartData} />
        </div>
    );
};
