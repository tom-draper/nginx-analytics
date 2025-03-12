import { Data } from "@/lib/types";
import { useEffect, useState } from "react";

type Stats = {
    lq: number,
    avg: number,
    uq: number
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function ResponseSize({ data }: { data: Data }) {
    const [stats, setStats] = useState<Stats | null>(null)

    useEffect(() => {
        const stats = {lq: 0, avg: 0, uq: 0}
        if (!data.length) {
            return;
        }

        let total = 0;
        for (const row of data) {
            total += row.responseSize || 0;
        }
        stats.avg = total / data.length;

        setStats(stats)
    }, [data])

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative">
            <h2 className="font-semibold">
                Response Size
            </h2>

            {stats && (
                <div className="flex mt-2 py-4">
                    <div className="flex-1 grid place-items-center">
                        <div className="px-4 py-3 rounded bg-[var(--hover-background)]">
                            <div>
                                {formatBytes(stats.avg)}
                            </div>
                            <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                Avg
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 grid place-items-center">
                        <div className="px-4 py-3 rounded bg-[var(--hover-background)]">
                            <div>
                                {formatBytes(stats.avg)}
                            </div>
                            <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                Avg
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 grid place-items-center">
                        <div className="px-4 py-3 rounded bg-[var(--hover-background)]">
                            <div>
                                {formatBytes(stats.avg)}
                            </div>
                            <div className="text-center text-xs text-[var(--text-muted4)] mt-1">
                                Avg
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div>

            </div>
        </div >
    )
}