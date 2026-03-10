"use client";
import { useMemo, memo } from "react";

function getColor(successRate: number | null) {
    if (successRate === null) {
        return 'var(--text-tinted)'
    } else if (successRate > 0.7) {
        return 'var(--highlight)'
    } else if (successRate < 0.25) {
        return 'var(--error)'
    } else {
        return 'var(--warn)'
    }
}

export const SuccessRate = memo(function SuccessRate({
    successRate,
    ratesTrend,
}: {
    successRate: number | null;
    ratesTrend: { date: string; rate: number }[];
}) {
    // Memoize SVG path — only recomputes when ratesTrend or successRate changes
    const backgroundGraph = useMemo(() => {
        if (!ratesTrend.length) return null;

        // Find the maximum value for scaling
        const maxRate = Math.max(...ratesTrend.map(b => b.rate), 1); // Ensure non-zero divisor

        // Graph dimensions
        const width = 100; // percentage width
        const height = 40; // pixels for graph height
        const graphColor = getColor(successRate);

        // Handle special cases with few data points
        if (ratesTrend.length === 1) {
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
                        fill={graphColor}
                        stroke="none"
                    />
                </svg>
            );
        } else if (ratesTrend.length === 2) {
            // For two data points, create a smoother transition between them
            const point1Y = height - (ratesTrend[0].rate / maxRate) * height;
            const point2Y = height - (ratesTrend[1].rate / maxRate) * height;

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
                        fill={graphColor}
                        stroke="none"
                    />
                </svg>
            );
        }

        // Calculate points for normal case (3+ data points)
        const points = ratesTrend.map((bucket, index) => {
            const x = (index / (ratesTrend.length - 1 || 1)) * width;
            const y = height - (bucket.rate / maxRate) * height;
            return `${x},${y}`;
        });

        // Create a smooth path with better curve handling
        let pathData = `M 0,${height} L 0,${points[0]?.split(',')[1] || height}`;

        // Add smooth curves between points
        for (let i = 1; i < points.length; i++) {
            const prevPoint = points[i-1].split(',').map(Number);
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
                    fill={graphColor}
                    stroke="none"
                />
            </svg>
        );
    }, [ratesTrend, successRate]);

    return (
        <div className="card flex-1 px-4 py-3 m-3 relative overflow-hidden">
            <h2 className="font-semibold">
                Success Rate
            </h2>
            <div className="text-3xl font-semibold grid place-items-center relative z-10">
                <div className="py-4" style={{
                    color: getColor(successRate),
                    textShadow: "0px 0px 3px rgba(0,0,0,0.5)"
                }}>
                    {successRate !== null ? successRate === 1 ? '100%' : successRate === 0 ? '0%' : `${(successRate * 100).toFixed(1)}%` : 'N/A'}
                </div>
            </div>

            {backgroundGraph}
        </div>
    );
});
