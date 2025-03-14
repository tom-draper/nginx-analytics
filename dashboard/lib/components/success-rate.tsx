"use client";
import { useEffect, useState } from "react";
import { NginxLog } from "../types";

function getSuccessRate(data: NginxLog[]) {
    if (!data || !data.length) {
        return null;
    }
    let success = 0;
    for (const row of data) {
        if (row.status === null) {
            continue;
        }
        if (row.status >= 200 && row.status <= 399) {
            success++;
        }
    }
    return success / data.length;
}

function getSuccessRatesByTime(data: NginxLog[]) {
    // Group success rates by time periods
    const successByTime = new Map();
    const requestsByTime = new Map();
    
    // Sort data by timestamp if available
    const sortedData = [...data].sort((a, b) => {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    });
    
    // Count successful requests per time bucket
    for (const row of sortedData) {
        const timestamp = new Date(row.timestamp || 0);
        // Using date as bucket key (could use hour, day, etc.)
        const timeKey = timestamp.toISOString().split('T')[0];
        
        if (!requestsByTime.has(timeKey)) {
            requestsByTime.set(timeKey, 0);
            successByTime.set(timeKey, 0);
        }
        
        requestsByTime.set(timeKey, requestsByTime.get(timeKey) + 1);
        
        if (row.status !== null && row.status >= 200 && row.status <= 399) {
            successByTime.set(timeKey, successByTime.get(timeKey) + 1);
        }
    }
    
    // Calculate success rate for each time period
    const ratesByTime = Array.from(requestsByTime.entries())
        .map(([date, count]) => {
            const successCount = successByTime.get(date) || 0;
            const rate = count > 0 ? successCount / count : 0;
            return { date, rate };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    
    // Consolidate into 6 buckets if we have more
    if (ratesByTime.length > 6) {
        const bucketSize = Math.ceil(ratesByTime.length / 6);
        const consolidatedBuckets = [];
        
        for (let i = 0; i < ratesByTime.length; i += bucketSize) {
            const chunk = ratesByTime.slice(i, i + bucketSize);
            // Calculate weighted average success rate for this time period
            const totalRequests = chunk.reduce((sum, b) => {
                const requests = requestsByTime.get(b.date) || 0;
                return sum + requests;
            }, 0);
            
            const totalSuccesses = chunk.reduce((sum, b) => {
                const requests = requestsByTime.get(b.date) || 0;
                return sum + (b.rate * requests);
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

export function SuccessRate({ data }: { data: NginxLog[] }) {
    const [successRate, setSuccessRate] = useState<number | null>(null);
    const [ratesTrend, setRatesTrend] = useState<Array<{date: string, rate: number}>>([]);

    useEffect(() => {
        setSuccessRate(getSuccessRate(data));
        setRatesTrend(getSuccessRatesByTime(data));
    }, [data]);

    // Calculate the path for the background graph
    const renderBackgroundGraph = () => {
        if (!ratesTrend.length) return null;
        
        // Graph dimensions
        const width = 100; // percentage width
        const height = 40; // pixels for graph height
        
        // Calculate points
        const points = ratesTrend.map((bucket, index) => {
            const x = (index / (ratesTrend.length - 1 || 1)) * width;
            // Use full height for better visualization of success rates
            const y = height - (bucket.rate * height);
            return `${x},${y}`;
        });
        
        // Create a smooth path
        // Start and end with bottom corners to create a filled shape
        const path = `
            M 0,${height}
            L 0,${points[0]?.split(',')[1] || height}
            ${points.map((point, i) => {
                if (i === 0) return '';
                const prevPoint = points[i-1].split(',');
                const currPoint = point.split(',');
                // Create a bezier curve for smoothing
                const cpX1 = Number(prevPoint[0]) + (Number(currPoint[0]) - Number(prevPoint[0])) / 2;
                return `C ${cpX1},${prevPoint[1]} ${cpX1},${currPoint[1]} ${currPoint[0]},${currPoint[1]}`;
            }).join(' ')}
            L ${width},${height}
            Z
        `;
        
        // Use the color based on the overall success rate but with lower opacity
        const graphColor = getColor(successRate);
        
        return (
            <svg
                className="absolute bottom-0 left-0 w-full h-10"
                preserveAspectRatio="none"
                viewBox={`0 0 ${width} ${height}`}
            >
                <path
                    d={path}
                    fill={graphColor}
                    fillOpacity="1"
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
                    {successRate !== null ? `${(successRate * 100).toFixed(1)}%` : 'N/A' }
                </div>
            </div>
            
            {renderBackgroundGraph()}
        </div>
    );
}