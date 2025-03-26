"use client";
import { useEffect, useState } from "react";
import { NginxLog } from "../types";
import { Period, periodStart } from "../period";

function getSuccessRate(data: NginxLog[], period: Period) {
    // Filter data by period if applicable
    const startDate = periodStart(period);
    const endDate = new Date(); // Current time as end date
    
    let filteredData = [...data];
    if (startDate) {
        filteredData = filteredData.filter(log => {
            const logDate = new Date(log.timestamp || 0);
            return logDate >= startDate && logDate <= endDate;
        });
    }

    if (!filteredData.length) {
        return null;
    }

    let success = 0;
    for (const row of filteredData) {
        if (row.status === null) {
            continue;
        }
        if (row.status >= 200 && row.status <= 399) {
            success++;
        }
    }
    return success / filteredData.length;
}

function getSuccessRatesByTime(data: NginxLog[], period: Period) {
    // Get period start date (if applicable)
    const startDate = periodStart(period);
    const endDate = new Date(); // Current time as end date
    
    // Filter data by period if startDate is available
    let filteredData = [...data];
    if (startDate) {
        filteredData = filteredData.filter(log => {
            const logDate = new Date(log.timestamp || 0);
            return logDate >= startDate && logDate <= endDate;
        });
    }

    // Determine appropriate bucket size based on period
    const bucketFormat: 'hour' | 'day' = period === '24 hours' ? 'hour' : 'day';

    // Sort data by timestamp if available
    const sortedData = filteredData.sort((a, b) => {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    });

    // Generate all time buckets within the period range
    const allBuckets = new Map<string, { requests: number, successes: number }>();
    
    if (startDate) {
        // Clone dates to avoid modifying the original
        const currentDate = new Date(startDate.getTime());
        
        while (currentDate <= endDate) {
            let timeKey: string;
            
            if (bucketFormat === 'hour') {
                // Format: YYYY-MM-DD HH
                timeKey = `${currentDate.toISOString().split('T')[0]} ${currentDate.getHours()}`;
                // Advance by 1 hour
                currentDate.setHours(currentDate.getHours() + 1);
            } else {
                // Format: YYYY-MM-DD
                timeKey = currentDate.toISOString().split('T')[0];
                // Advance by 1 day
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            allBuckets.set(timeKey, { requests: 0, successes: 0 });
        }
    }

    // Count actual requests and successes per time bucket
    for (const row of sortedData) {
        const timestamp = new Date(row.timestamp || 0);
        let timeKey: string;
        
        if (bucketFormat === 'hour') {
            // Format: YYYY-MM-DD HH
            timeKey = `${timestamp.toISOString().split('T')[0]} ${timestamp.getHours()}`;
        } else {
            // Format: YYYY-MM-DD
            timeKey = timestamp.toISOString().split('T')[0];
        }
        
        // Ensure the bucket exists
        if (!allBuckets.has(timeKey)) {
            allBuckets.set(timeKey, { requests: 1, successes: 0 });
        } else {
            const bucket = allBuckets.get(timeKey)!;
            bucket.requests++;
        }

        // Count successful requests
        if (row.status !== null && row.status >= 200 && row.status <= 399) {
            const bucket = allBuckets.get(timeKey)!;
            bucket.successes++;
        }
    }

    // Convert to array of points for graphing
    const ratesByTime = Array.from(allBuckets.entries())
        .map(([date, { requests, successes }]) => ({
            date, 
            rate: requests > 0 ? successes / requests : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

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

export function SuccessRate({ data, period }: { data: NginxLog[], period: Period }) {
    const [successRate, setSuccessRate] = useState<number | null>(null);
    const [ratesTrend, setRatesTrend] = useState<Array<{ date: string, rate: number }>>([]);

    useEffect(() => {
        setSuccessRate(getSuccessRate(data, period));
        setRatesTrend(getSuccessRatesByTime(data, period));
    }, [data, period]);

    // Rest of the component remains the same as in the previous implementation
    const renderBackgroundGraph = () => {
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
                    className="absolute bottom-0 left-0 w-full h-10"
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
                    className="absolute bottom-0 left-0 w-full h-10"
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
                className="absolute bottom-0 left-0 w-full h-10"
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
    };

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

            {renderBackgroundGraph()}
        </div>
    );
}