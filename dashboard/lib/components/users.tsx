'use client';

import { useMemo, useState, memo } from "react";
import { NginxLog } from "@/lib/types";
import { Period, periodStart, getPeriodRange, hoursInRange } from "@/lib/period";
import { getUserId } from "@/lib/user";
import TrendGraph, { consolidateTo6 } from "@/lib/components/trend-graph";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function getUserCount(data: NginxLog[]): number {
    const users = new Set<string>();
    for (const row of data) {
        users.add(getUserId(row.ipAddress, row.userAgent));
    }
    return users.size;
}

function getUsersByTime(data: NginxLog[], period: Period): number[] {
    const startDate = periodStart(period);
    const byHour = period === '24 hours';
    const step = byHour ? MS_PER_HOUR : MS_PER_DAY;

    const allBuckets = new Map<number, number>();

    if (startDate) {
        const startKey = Math.floor(startDate / step);
        const endKey = Math.floor(Date.now() / step);
        for (let key = startKey; key <= endKey; key++) {
            allBuckets.set(key, 0);
        }
    }

    for (const row of data) {
        const ts = row.timestamp;
        if (!ts) continue;
        const timeKey = Math.floor(ts / step);
        allBuckets.set(timeKey, (allBuckets.get(timeKey) ?? 0) + 1);
    }

    const values = Array.from(allBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, count]) => count);

    return consolidateTo6(values);
}

export default memo(function Users({ data, period }: { data: NginxLog[], period: Period }) {
    const [displayMode, setDisplayMode] = useState<'total' | 'per-hour'>('total');

    const { users, userValues } = useMemo(() => {
        const range = getPeriodRange(period, data);
        if (!range) return { users: { total: 0, perHour: 0 }, userValues: [] };

        const totalUsers = getUserCount(data);
        const usersPerHour = totalUsers / hoursInRange(range.start, range.end);

        return {
            users: { total: totalUsers, perHour: usersPerHour },
            userValues: getUsersByTime(data, period),
        };
    }, [data, period]);

    const toggleDisplayMode = () => {
        setDisplayMode(current => current === 'total' ? 'per-hour' : 'total');
    };

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

            <TrendGraph values={userValues} />
        </div>
    );
});
