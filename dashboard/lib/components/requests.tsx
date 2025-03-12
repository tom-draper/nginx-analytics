'use client';

import { useEffect, useState } from "react";
import { Data } from "../types";

function getRequestsByTime(data: Data) {
    // Group requests by time periods
    const requestsByTime = new Map();
    
    // Sort data by timestamp if available
    const sortedData = [...data].sort((a, b) => {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    });
    
    // Count requests per time bucket
    for (const row of sortedData) {
        const timestamp = new Date(row.timestamp || 0);
        // Using date as bucket key (could use hour, day, etc.)
        const timeKey = timestamp.toISOString().split('T')[0];
        
        if (!requestsByTime.has(timeKey)) {
            requestsByTime.set(timeKey, 0);
        }
        requestsByTime.set(timeKey, requestsByTime.get(timeKey) + 1);
    }
    
    // Convert to array of points for graphing
    const buckets = Array.from(requestsByTime.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));
    
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

export function Requests({ data }: { data: Data }) {
    const [count, setCount] = useState(data.length);
    const [requestTrend, setRequestTrend] = useState<Array<{date: string, count: number}>>([]);

    useEffect(() => {
        setCount(data.length);
        setRequestTrend(getRequestsByTime(data));
    }, [data]);

    // Calculate the path for the background graph
    const renderBackgroundGraph = () => {
        if (!requestTrend.length) return null;
        
        // Find the maximum value for scaling
        const maxCount = Math.max(...requestTrend.map(b => b.count));
        
        // Graph dimensions
        const width = 100; // percentage width
        const height = 40; // pixels for graph height
        
        // Calculate points
        const points = requestTrend.map((bucket, index) => {
            const x = (index / (requestTrend.length - 1 || 1)) * width;
            const y = height - (bucket.count / maxCount) * height;
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
        
        return (
            <svg
                className="absolute bottom-0 left-0 w-full h-10 opacity-100"
                preserveAspectRatio="none"
                viewBox={`0 0 ${width} ${height}`}
            >
                <path
                    d={path}
                    fill="var(--highlight)"
                    stroke="none"
                />
            </svg>
        );
    };

    return (
        <div className="card flex-1 px-4 py-3 m-3 relative overflow-hidden">
            <h2 className="font-semibold">
                Requests
            </h2>

            <div className="text-3xl font-semibold grid place-items-center relative z-10">
                <div className="py-4 text-[var(--text-tinted)]" style={{textShadow: "0px 0px 3px rgba(0,0,0,0.5)"}}>
                    {count.toLocaleString()}
                </div>
            </div>
            
            {renderBackgroundGraph()}
        </div>
    );
}