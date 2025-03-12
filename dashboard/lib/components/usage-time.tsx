import { PolarArea } from "react-chartjs-2";
import { Data } from "../types";
import { useEffect, useState, useRef } from "react";
import { Chart as ChartJS, ChartData, RadialLinearScale, ArcElement, Tooltip } from "chart.js";

ChartJS.register(RadialLinearScale, ArcElement, Tooltip);

export default function UsageTime({ data }: { data: Data }) {
    const [plotData, setPlotData] = useState<ChartData<"polarArea"> | null>(null);
    const chartRef = useRef<ChartJS>(null);

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

        // Reorder the hours to start with 12 (noon) at the top
        // This means we need to shift the array so that index 12 becomes index 0
        const reorderedHours = [...hourCounts.slice(12), ...hourCounts.slice(0, 12)];
        
        // Create formatted time labels (hh:mm)
        const timeLabels = Array.from({ length: 24 }, (_, i) => {
            // Calculate the actual hour (starting from noon at the top)
            const hour = (i + 12) % 24;
            return `${hour.toString().padStart(2, '0')}:00`;
        });

        setPlotData({
            labels: timeLabels,
            datasets: [{
                label: 'Requests per Hour',
                data: reorderedHours,
                backgroundColor: 'rgb(26, 240, 115)',
                borderWidth: 0,
                borderColor: '#fff'
            }]
        });
    }, [data]);

    // Add a plugin to adjust label positions
    const plugins = [{
        id: 'customLabelPositioning',
        beforeDraw: (chart) => {
            if (!chart.config.data.labels) {
                return;
            }
            
            const ctx = chart.ctx;
            const centerX = chart.chartArea.width / 2 + chart.chartArea.left;
            const centerY = chart.chartArea.height / 2 + chart.chartArea.top;
            const radius = Math.min(chart.chartArea.width, chart.chartArea.height) / 2;
            
            ctx.save();
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#666666'
            
            const labels = chart.config.data.labels;
            const angleSize = (2 * Math.PI) / labels.length;
            
            for (let i = 0; i < labels.length; i++) {
                // Calculate angle for this segment (accounting for rotation to put noon at top)
                // Rotate by -90 degrees (or -π/2 radians) to start at top
                // Then adjust by the segment size times the index
                const angle = -Math.PI / 2 + i * angleSize;
                
                // Position slightly outside the chart area
                const labelRadius = radius * 1.05;
                const x = centerX + Math.cos(angle) * labelRadius;
                const y = centerY + Math.sin(angle) * labelRadius;
                
                // Rotate text to be perpendicular to radius
                ctx.save();
                ctx.translate(x, y);
                
                ctx.rotate(angle + Math.PI / 2);
                
                ctx.fillText(labels[i] as string, 0, 0);
                ctx.restore();
            }
            
            ctx.restore();
        }
    }];

    return (
        <div className="card flex-1 px-4 py-3 m-3 w-inherit">
            <h2 className="font-semibold">Usage Time</h2>
            <div className="relative w-full h-full pt-2" style={{ height: '600px' }}>
                {plotData && <PolarArea 
                    ref={chartRef}
                    data={plotData} 
                    plugins={plugins}
                    options={{
                        plugins: {
                            legend: { display: false },
                            tooltip: { 
                                enabled: true,
                                callbacks: {
                                    title: (items) => items[0].label,
                                    label: (context) => `${context.raw.toLocaleString()} requests`
                                }
                            },
                        },
                        scales: {
                            r: {
                                ticks: { display: false },
                                grid: { circular: true },
                                pointLabels: { display: false } // Disable default labels
                            }
                        },
                        layout: {
                            padding: {
                                top: 25,
                                bottom: 40,
                                left: 60,
                                right: 60,
                            },
                            
                        },
                        responsive: true,
                        maintainAspectRatio: false,
                    }} 
                />}
            </div>
        </div>
    );
}