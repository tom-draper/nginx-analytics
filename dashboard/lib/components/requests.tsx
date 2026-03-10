'use client';

import { useMemo, useState, memo } from "react";

export const Requests = memo(function Requests({
    requestsTotal,
    requestsPerHour,
    requestsTrend,
}: {
    requestsTotal: number;
    requestsPerHour: number;
    requestsTrend: { date: string; count: number }[];
}) {
    const [displayMode, setDisplayMode] = useState<'total' | 'per-hour'>('total');

    const requests = { total: requestsTotal, perHour: requestsPerHour };
    const requestTrend = requestsTrend;

    // Toggle display mode
    const toggleDisplayMode = () => {
        setDisplayMode(current =>
            current === 'total' ? 'per-hour' : 'total'
        );
    };

    // Memoize SVG path — only recomputes when requestTrend changes, not on displayMode toggle
    const backgroundGraph = useMemo(() => {
        if (!requestTrend.length) return null;

        // Find the maximum value for scaling
        const maxCount = Math.max(...requestTrend.map(b => b.count), 1); // Ensure non-zero divisor

        // Graph dimensions
        const width = 100; // percentage width
        const height = 40; // pixels for graph height

        // Handle special cases with few data points
        if (requestTrend.length === 1) {
            // For a single data point, create a bell curve shape
            return (
                <svg
                    className="absolute bottom-0 left-0 w-full h-6"
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${width} ${height}`}
                >
                    <path
                        d={`
                            M 0,${height}
                            C 20,${height} 30,${height - (height * 0.2)} 40,${height - (height * 0.8)}
                            C 45,${height - (height * 1)} 55,${height - (height * 1)} 60,${height - (height * 0.8)}
                            C 70,${height - (height * 0.2)} 80,${height} 100,${height}
                            Z
                        `}
                        fill="var(--highlight)"
                        stroke="none"
                    />
                </svg>
            );
        } else if (requestTrend.length === 2) {
            // For two data points, create a smoother transition between them
            const point1Y = height - (requestTrend[0].count / maxCount) * height;
            const point2Y = height - (requestTrend[1].count / maxCount) * height;

            return (
                <svg
                    className="absolute bottom-0 left-0 w-full h-6"
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${width} ${height}`}
                >
                    <path
                        d={`
                            M 0,${height}
                            L 0,${point1Y}
                            C 25,${point1Y} 25,${point2Y} 50,${point2Y}
                            C 75,${point2Y} 75,${height} 100,${height}
                            Z
                        `}
                        fill="var(--highlight)"
                        stroke="none"
                    />
                </svg>
            );
        }

        // Calculate points for normal case (3+ data points)
        const points = requestTrend.map((bucket, index) => {
            const x = (index / (requestTrend.length - 1 || 1)) * width;
            const y = height - (bucket.count / maxCount) * height;
            return `${x},${y}`;
        });

        // Create a smooth path with better curve handling
        let pathData = `M 0,${height} L 0,${points[0]?.split(',')[1] || height}`;

        // Add smooth curves between points
        for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i - 1].split(',').map(Number);
            const currPoint = points[i].split(',').map(Number);

            // Control points for the bezier curve
            const cpX1 = prevPoint[0] + (currPoint[0] - prevPoint[0]) / 3;
            const cpX2 = prevPoint[0] + 2 * (currPoint[0] - prevPoint[0]) / 3;

            pathData += ` C ${cpX1},${prevPoint[1]} ${cpX2},${currPoint[1]} ${currPoint[0]},${currPoint[1]}`;
        }

        // Close the path
        pathData += ` L ${width},${height} Z`;

        return (
            <svg
                className="absolute bottom-0 left-0 w-full h-6"
                preserveAspectRatio="none"
                viewBox={`0 0 ${width} ${height}`}
            >
                <path
                    d={pathData}
                    fill="var(--highlight)"
                    stroke="none"
                />
            </svg>
        );
    }, [requestTrend]);

    return (
        <div
            className="card flex-1 px-4 py-3 m-3 relative overflow-hidden cursor-pointer"
            onClick={toggleDisplayMode}
        >
            <h2 className="font-semibold flex justify-between items-center">
                Requests
                <span className="text-xs text-gray-500">
                    {displayMode !== 'total' ? '/ hour' : null}
                </span>
            </h2>

            <div className="text-3xl font-semibold grid place-items-center relative z-10">
                <div
                    className="py-4 text-[var(--text-tinted)]"
                    style={{ textShadow: "0px 0px 3px rgba(0,0,0,0.5)" }}
                >
                    {displayMode === 'total'
                        ? requests.total.toLocaleString()
                        : requests.perHour === 0 ? 0 : requests.perHour.toFixed(2)
                    }
                </div>
            </div>

            {backgroundGraph}
        </div>
    );
});
