import { useEffect, useState } from "react";
import { Data } from "../types";

function getSuccessRate(data: Data) {
    if (!data || !data.length) {
        return 0;
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

export function SuccessRate({ data }: { data: Data }) {

    const [successRate, setSuccessRate] = useState<number | null>(null);
    useEffect(() => {
        setSuccessRate(getSuccessRate(data))
    }, [data])

    return (
        <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
            <h2 className="font-semibold">
                Success Rate
            </h2>

            <div className="text-3xl font-semibold grid place-items-center">
                <div className="py-6">
                    {successRate !== null}
                </div>
            </div>
        </div>
    )
}