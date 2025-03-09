'use client';

import { useEffect, useState } from "react";
import { Data } from "../types";

type Endpoint = {
    path: string
    method: string
    status?: number
    count: number
}

export function Endpoints({ data }: { data: Data }) {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([])

    useEffect(() => {
        const groupedEndpoints: { [id: string]: number } = {};
        for (const row of data) {
            const endpointId = `${row.path}::${row.method}::${row.status}`
            if (groupedEndpoints[endpointId]) {
                groupedEndpoints[endpointId]++
            } else {
                groupedEndpoints[endpointId] = 1
            }
        }

        const endpoints: Endpoint[] = [];
        for (const [endpointId, count] of Object.entries(groupedEndpoints)) {
            const [path, method, status] = endpointId.split('::');
            endpoints.push({
                path,
                method,
                count,
                status: status ? parseInt(status) : undefined,
            })
        }

        setEndpoints(endpoints.sort((a, b) => b.count - a.count).slice(0, 50));
    }, [data])

    return (
        <div className="border rounded-lg border-gray-300 flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Endpoints
            </h2>
            <div className="mt-2">
                {endpoints.map((endpoint, index) => (
                    <button key={index} className="bg-gray-100 my-2 rounded w-full relative cursor-pointer flex items-center">
                        <span className="text-sm flex items-center mx-2 z-50 py-[2px]">
                            <span className="pr-1">
                                {endpoint.count.toLocaleString()}
                            </span>
                            <span className="px-1 text-gray-600">
                                {endpoint.method}
                            </span>
                            <span className="px-1 text-gray-600 text-left break-words">
                                {endpoint.path ?? ''}
                            </span>
                        </span>

                        <div className="bg-[var(--other-green)] h-full rounded absolute inset-0" style={{
                            width: `${(endpoint.count / endpoints[0].count) * 100}%`
                        }}></div>
                    </button>
                ))}
            </div>
        </div>


    )
}