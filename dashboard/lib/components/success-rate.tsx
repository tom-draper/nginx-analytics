"use client";
import { useMemo, memo } from "react";
import { NginxLog } from "../types";
import { Period, periodStart } from "../period";
import TrendGraph from "@/lib/components/trend-graph";

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

function getSuccessRatesByTime(data: NginxLog[], period: Period): number[] {
    const startDate = periodStart(period);
    const byHour = period === '24 hours';
    const step = byHour ? MS_PER_HOUR : MS_PER_DAY;

    const allBuckets = new Map<number, { requests: number; successes: number }>();

    if (startDate) {
        const startKey = Math.floor(startDate / step);
        const endKey = Math.floor(Date.now() / step);
        for (let key = startKey; key <= endKey; key++) {
            allBuckets.set(key, { requests: 0, successes: 0 });
        }
    }

    for (const row of data) {
        const ts = row.timestamp;
        if (!ts) continue;
        const timeKey = Math.floor(ts / step);

        const bucket = allBuckets.get(timeKey) ?? { requests: 0, successes: 0 };
        bucket.requests++;
        if (row.status !== null && row.status >= 200 && row.status <= 399) {
            bucket.successes++;
        }
        allBuckets.set(timeKey, bucket);
    }

    // Sort buckets and consolidate to at most 6, preserving weighted accuracy
    let sorted = Array.from(allBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, counts]) => counts);

    if (sorted.length > 6) {
        const size = Math.ceil(sorted.length / 6);
        const consolidated: typeof sorted = [];
        for (let i = 0; i < sorted.length; i += size) {
            const chunk = sorted.slice(i, i + size);
            consolidated.push({
                requests: chunk.reduce((s, b) => s + b.requests, 0),
                successes: chunk.reduce((s, b) => s + b.successes, 0),
            });
        }
        sorted = consolidated;
    }

    return sorted.map(({ requests, successes }) =>
        requests > 0 ? successes / requests : 0
    );
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
    const { successRate, rateValues } = useMemo(() => ({
        successRate: getSuccessRate(data),
        rateValues: getSuccessRatesByTime(data, period),
    }), [data, period]);

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

            <TrendGraph values={rateValues} color={getColor(successRate)} />
        </div>
    );
});
