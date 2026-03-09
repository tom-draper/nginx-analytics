'use client';

import { useMemo, memo } from "react";
import { NginxLog } from "../types";

// getDay() → 0=Sun, 1=Mon, ..., 6=Sat
const DAYS: { label: string; day: number }[] = [
    { label: 'Mon', day: 1 },
    { label: 'Tue', day: 2 },
    { label: 'Wed', day: 3 },
    { label: 'Thu', day: 4 },
    { label: 'Fri', day: 5 },
    { label: 'Sat', day: 6 },
    { label: 'Sun', day: 0 },
];

export default memo(function UsageDay({
    data,
    filterDayOfWeek,
    setFilterDayOfWeek,
}: {
    data: NginxLog[];
    filterDayOfWeek: number | null;
    setFilterDayOfWeek: (day: number | null) => void;
}) {
    const counts = useMemo(() => {
        const dayCounts = new Array(7).fill(0);
        for (const row of data) {
            if (!row.timestamp) continue;
            dayCounts[row.timestamp.getDay()]++;
        }
        return dayCounts;
    }, [data]);

    const visibleDays = filterDayOfWeek === null
        ? DAYS
        : DAYS.filter(({ day }) => day === filterDayOfWeek);

    const max = Math.max(...visibleDays.map(({ day }) => counts[day]), 1);

    const selectDay = (day: number) => {
        setFilterDayOfWeek(filterDayOfWeek === day ? null : day);
    };

    return (
        <div className="card px-4 py-3 mx-3 mt-3 relative min-h-53">
            <h2 className="font-semibold">Usage Day</h2>

            <div className="flex mt-2">
                {visibleDays.map(({ label, day }) => {
                    const count = counts[day];
                    return (
                        <div key={day} className="flex-1">
                            <div
                                className="flex-1 rounded h-32 mx-1 my-1 cursor-pointer grid hover:bg-[var(--hover-background)]"
                                title={`${label}: ${count.toLocaleString()} requests`}
                                onClick={() => selectDay(day)}
                            >
                                <div
                                    className="bg-[var(--highlight)] rounded mt-auto"
                                    style={{ height: `${(count / max) * 100}%` }}
                                />
                            </div>
                            <div className="text-center text-xs text-[var(--text-muted3)]">
                                {label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
