'use client';

import { useMemo, useState, memo } from "react";
import TrendGraph, { consolidateTo6 } from "@/lib/components/trend-graph";

export const Requests = memo(function Requests({
    totalRequests,
    totalHours,
    trendReqBuckets,
}: {
    totalRequests:   number;
    totalHours:      number;
    trendReqBuckets: number[];
}) {
    const [displayMode, setDisplayMode] = useState<'total' | 'per-hour'>('total');

    const { requests, requestValues } = useMemo(() => ({
        requests: {
            total:   totalRequests,
            perHour: totalRequests / Math.max(totalHours, 1),
        },
        requestValues: consolidateTo6(trendReqBuckets),
    }), [totalRequests, totalHours, trendReqBuckets]);

    const toggleDisplayMode = () => {
        setDisplayMode(current => current === 'total' ? 'per-hour' : 'total');
    };

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

            <TrendGraph values={requestValues} />
        </div>
    );
});
