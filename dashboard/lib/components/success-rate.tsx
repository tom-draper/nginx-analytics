"use client";

import { useEffect, useState } from "react";
import { Data } from "../types";

function getSuccessRate(data: Data) {
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

export function SuccessRate({ data }: { data: Data }) {
    const [successRate, setSuccessRate] = useState<number | null>(null);
    useEffect(() => {
        setSuccessRate(getSuccessRate(data))
    }, [data])

    return (
        <div className="card flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Success Rate
            </h2>

            <div className="text-3xl font-semibold grid place-items-center">
                <div className="py-4" style={{
                    color: getColor(successRate)
                }}>
                    {successRate !== null ? `${(successRate * 100).toFixed(1)}%` : 'N/A' }
                </div>
            </div>
        </div>
    )
}