'use client';

import { useMemo, useState, memo } from "react";
import { NginxLog } from "../types";
import { getUserId } from "../user";
import { getPeriodRange, hoursInRange, Period, periodStart } from "../period";

// data is already period-filtered by the parent (filteredData), so no re-filter needed
function getUsers(data: NginxLog[]) {
    const users = new Set<string>();
    for (const row of data) {
        const userId = getUserId(row.ipAddress, row.userAgent);
        if (userId) users.add(userId);
    }
    return users;
}

function getUserCount(data: NginxLog[]) {
    return getUsers(data).size;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function getUsersByTime(data: NginxLog[], period: Period) {
    const startDate = periodStart(period);
    const endDate = new Date();

    const byHour = period === '24 hours';

    // Generate all time buckets using integer keys — avoids toISOString() / string
    // allocation on every row in the hot loop below.
    const allBuckets = new Map<number, number>();

    if (startDate) {
        const step = byHour ? MS_PER_HOUR : MS_PER_DAY;
        const startKey = Math.floor(startDate / step);
        const endKey = Math.floor(endDate.getTime() / step);
        for (let key = startKey; key <= endKey; key++) {
            allBuckets.set(key, 0);
        }
    }

    // data is already period-filtered and sorted by the parent — use directly
    for (const row of data) {
        const ts = row.timestamp;
        if (!ts) continue;
        const userId = getUserId(row.ipAddress, row.userAgent);
        if (!userId) continue;

        const step = byHour ? MS_PER_HOUR : MS_PER_DAY;
        const timeKey = Math.floor(ts / step);

        allBuckets.set(timeKey, (allBuckets.get(timeKey) ?? 0) + 1);
    }

    const buckets = Array.from(allBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([date, count]) => ({ date, count }));

    // If no period is specified and no data, return empty array
    if (buckets.length === 0) {
        return [];
    }

    // Consolidate into 6 buckets if we have more
    if (buckets.length > 6) {
        const bucketSize = Math.ceil(buckets.length / 6);
        const consolidatedBuckets = [];

        for (let i = 0; i < buckets.length; i += bucketSize) {
            const chunk = buckets.slice(i, i + bucketSize);
            const totalCount = chunk.reduce((sum, b) => sum + b.count, 0);
            consolidatedBuckets.push({
                date: chunk[0].date,
                count: totalCount
            });
        }

        return consolidatedBuckets;
    }

    return buckets;
}

export default memo(function Users({ data, period }: { data: NginxLog[], period: Period }) {
    const [displayMode, setDisplayMode] = useState<'total' | 'per-hour'>('total');

    const { users, userTrend } = useMemo(() => {
        const range = getPeriodRange(period, data);
        if (!range) return { users: { total: 0, perHour: 0 }, userTrend: [] };

        const totalUsers = getUserCount(data);
        const usersPerHour = totalUsers / hoursInRange(range.start, range.end);

        return {
            users: { total: totalUsers, perHour: usersPerHour },
            userTrend: getUsersByTime(data, period)
        };
    }, [data, period]);

    // Toggle display mode
    const toggleDisplayMode = () => {
        setDisplayMode(current =>
            current === 'total' ? 'per-hour' : 'total'
        );
    };

    // Memoize SVG path — only recomputes when userTrend changes, not on displayMode toggle
    const backgroundGraph = useMemo(() => {
        if (!userTrend.length) return null;

        // Find the maximum value for scaling
        const maxCount = Math.max(...userTrend.map(b => b.count), 1); // Ensure non-zero divisor

        // Graph dimensions
        const width = 100; // percentage width
        const height = 40; // pixels for graph height

        // Handle special cases with few data points
        if (userTrend.length === 1) {
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
        } else if (userTrend.length === 2) {
            // For two data points, create a smoother transition between them
            const point1Y = height - (userTrend[0].count / maxCount) * height;
            const point2Y = height - (userTrend[1].count / maxCount) * height;

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
        const points = userTrend.map((bucket, index) => {
            const x = (index / (userTrend.length - 1 || 1)) * width;
            const y = height - (bucket.count / maxCount) * height;
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
                    fill="var(--highlight)"
                    stroke="none"
                />
            </svg>
        );
    }, [userTrend]);

    return (
        <div
            className="card flex-1 px-4 py-3 m-3 relative overflow-hidden cursor-pointer"
            onClick={toggleDisplayMode}
        >
            <h2 className="font-semibold flex justify-between items-center">
                Users
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
                        ? users.total.toLocaleString()
                        : users.perHour === 0 ? 0 : users.perHour.toFixed(2)
                    }
                </div>
            </div>

            {backgroundGraph}
        </div>
    );
});
