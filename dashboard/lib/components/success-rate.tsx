"use client";
import { useMemo, memo } from "react";
import { NginxLog } from "../types";
import { Period, periodStart } from "../period";

// data is already period-filtered by the parent (filteredData), so no re-filter needed
function getSuccessRate(data: NginxLog[]) {
    if (!data.length) return null;

    let success = 0;
    for (const row of data) {
        if (row.status === null) continue;
        if (row.status >= 200 && row.status <= 399) success++;
    }
    return success / data.length;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function getSuccessRatesByTime(data: NginxLog[], period: Period) {
    const startDate = periodStart(period);
    const endDate = new Date();

    const byHour = period === '24 hours';

    // Generate all time buckets using integer keys — avoids toISOString() / string
    // allocation on every row in the hot loop below.
    const allBuckets = new Map<number, { requests: number, successes: number }>();

    if (startDate) {
        const step = byHour ? MS_PER_HOUR : MS_PER_DAY;
        const startKey = Math.floor(startDate / step);
        const endKey = Math.floor(endDate.getTime() / step);
        for (let key = startKey; key <= endKey; key++) {
            allBuckets.set(key, { requests: 0, successes: 0 });
        }
    }

    // data is already period-filtered and sorted by the parent — no copy, filter, or sort needed
    for (const row of data) {
        const ts = row.timestamp;
        if (!ts) continue;
        const step = byHour ? MS_PER_HOUR : MS_PER_DAY;
        const timeKey = Math.floor(ts / step);

        // Ensure the bucket exists
        if (!allBuckets.has(timeKey)) {
            allBuckets.set(timeKey, { requests: 1, successes: 0 });
        } else {
            allBuckets.get(timeKey)!.requests++;
        }

        if (row.status !== null && row.status >= 200 && row.status <= 399) {
            allBuckets.get(timeKey)!.successes++;
        }
    }

    const ratesByTime = Array.from(allBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([date, { requests, successes }]) => ({
            date,
            rate: requests > 0 ? successes / requests : 0
        }));

    // Consolidate into 6 buckets if we have more
    if (ratesByTime.length > 6) {
        const bucketSize = Math.ceil(ratesByTime.length / 6);
        const consolidatedBuckets = [];

        for (let i = 0; i < ratesByTime.length; i += bucketSize) {
            const chunk = ratesByTime.slice(i, i + bucketSize);
            const totalRequests = chunk.reduce((sum, b) => {
                const bucketData = allBuckets.get(b.date);
                return sum + (bucketData?.requests || 0);
            }, 0);

            const totalSuccesses = chunk.reduce((sum, b) => {
                const bucketData = allBuckets.get(b.date);
                return sum + (bucketData?.successes || 0);
            }, 0);

            const avgRate = totalRequests > 0 ? totalSuccesses / totalRequests : 0;

            consolidatedBuckets.push({
                date: chunk[0].date,
                rate: avgRate
            });
        }

        return consolidatedBuckets;
    }

    return ratesByTime;
}

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

export const SuccessRate = memo(function SuccessRate({ data, period }: { data: NginxLog[], period: Period }) {
    const { successRate, ratesTrend } = useMemo(() => ({
        successRate: getSuccessRate(data),
        ratesTrend: getSuccessRatesByTime(data, period),
    }), [data, period]);

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
