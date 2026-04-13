"use client";
import { useMemo, memo } from "react";
import TrendGraph from "@/lib/components/trend-graph";

function getColor(successRate: number | null) {
    if (successRate === null) return 'var(--text-tinted)';
    if (successRate > 0.7)   return 'var(--highlight)';
    if (successRate < 0.25)  return 'var(--error)';
    return 'var(--warn)';
}

// Consolidate arbitrarily many rate buckets down to at most 6, preserving
// weighted accuracy by summing success/total counts before dividing.
function consolidateRates(buckets: Array<{ success: number; total: number }>): number[] {
    if (buckets.length === 0) return [];
    const size = Math.ceil(buckets.length / 6);
    const result: number[] = [];
    for (let i = 0; i < buckets.length; i += size) {
        const chunk = buckets.slice(i, i + size);
        const totalReq = chunk.reduce((s, b) => s + b.total, 0);
        const totalSucc = chunk.reduce((s, b) => s + b.success, 0);
        result.push(totalReq > 0 ? totalSucc / totalReq : 0);
    }
    return result;
}

export const SuccessRate = memo(function SuccessRate({
    successCount,
    successTotal,
    trendRateBuckets,
}: {
    successCount:     number;
    successTotal:     number;
    trendRateBuckets: Array<{ success: number; total: number }>;
}) {
    const { successRate, rateValues } = useMemo(() => ({
        successRate: successTotal > 0 ? successCount / successTotal : null,
        rateValues:  consolidateRates(trendRateBuckets),
    }), [successCount, successTotal, trendRateBuckets]);

    return (
        <div className="card flex-1 px-4 py-3 m-3 relative overflow-hidden">
            <h2 className="font-semibold">Success Rate</h2>
            <div className="text-3xl font-semibold grid place-items-center relative z-10">
                <div className="py-4" style={{
                    color: getColor(successRate),
                    textShadow: "0px 0px 3px rgba(0,0,0,0.5)"
                }}>
                    {successRate !== null
                        ? successRate === 1 ? '100%' : successRate === 0 ? '0%' : `${(successRate * 100).toFixed(1)}%`
                        : 'N/A'}
                </div>
            </div>
            <TrendGraph values={rateValues} color={getColor(successRate)} />
        </div>
    );
});
