'use client';

import { useEffect, useState } from "react";
import { NginxLog } from "../types";
import { clientErrorStatus, redirectStatus, serverErrorStatus } from "../status";

type Endpoint = {
    path: string
    method: string
    status?: number
    count: number
}

export function Endpoints({ data, filterPath, filterMethod, filterStatus, setEndpoint, setStatus }: { data: NginxLog[], filterPath: string | null, filterMethod: string | null, filterStatus: number | [number, number][] | null, setEndpoint: (path: string | null, method: string | null, status: number | [number, number][] | null) => void, setStatus: (status: number | [number, number][] | null) => void }) {
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

    const selectEndpoint = (path: string, method: string, status: number | null) => {
        if (endpoints.length <= 1) {
            setEndpoint(null, null, null)
        } else if (path !== filterPath) {
            setEndpoint(path, filterMethod, filterStatus)
        } else if (method && path === filterPath && method !== filterMethod && !allSameMethod()) {
            setEndpoint(path, method, filterStatus)
        } else if (status && path === filterPath && (method === filterMethod || allSameMethod()) && status !== filterStatus) {
            setEndpoint(path, method, status)
        } else {
            setEndpoint(null, null, null)
        }
    }

    const allSameMethod = () => {
        if (!endpoints) {
            return false;
        }
        const method = endpoints[0].method;
        for (let i = 1; i < endpoints.length - 1; i++) {
            if (endpoints[i].method !== method) {
                return false;
            }
        }
        return true;
    }

    const selectAllStatus = () => {
        setStatus(null)
    }

    const selectStatusRange = (range: [number, number]) => {
        if (Array.isArray(filterStatus)) {
            if (filterStatus.some(pair => pair.every((value, i) => value === range[i]))) {
                if (filterStatus.length === 1) {
                    setStatus(null);
                } else {
                    setStatus(filterStatus.filter(pair => !(pair[0] === range[0] && pair[1] === range[1])))
                }
            } else {
                setStatus([...filterStatus, range])
            }
        } else {
            setStatus([range])
        }
    }

    const selectSuccessStatus = () => {
        const target: [number, number] = [200, 299]
        selectStatusRange(target);
    }

    const selectRedirectStatus = () => {
        const target: [number, number] = [300, 399]
        selectStatusRange(target);
    }

    const selectClientErrorStatus = () => {
        const target: [number, number] = [400, 499]
        selectStatusRange(target);
    }

    const selectServerErrorStatus = () => {
        const target: [number, number] = [500, 599]
        selectStatusRange(target);
    }

    const getBackground = (status: number | undefined) => {
        if (!status) {
            return 'var(--highlight)'
        }

        if (clientErrorStatus(status)) {
            return 'var(--warn)'
        }

        if (serverErrorStatus(status)) {
            return 'var(--error)'
        }

        if (redirectStatus(status)) {
            return 'var(--info)'
        }

        return 'var(--highlight)'
    }

    return (
        <div className="card flex-1 px-4 py-3 m-3 min-h-[16em] relative">
            <h2 className="font-semibold">
                Endpoints
            </h2>
            <div className="absolute flex top-[14px] right-4 text-xs text-[var(--text-muted3)]">
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer" onClick={selectSuccessStatus} style={{ color: Array.isArray(filterStatus) && filterStatus.some(pair => pair.every((value, i) => value === [200, 299][i])) ? 'var(--highlight)' : '' }}>
                    Success
                </button>
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer" onClick={selectRedirectStatus} style={{ color: Array.isArray(filterStatus) && filterStatus.some(pair => pair.every((value, i) => value === [300, 399][i])) ? 'var(--info)' : '' }}>
                    Redirect
                </button>
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer" onClick={selectClientErrorStatus} style={{ color: Array.isArray(filterStatus) && filterStatus.some(pair => pair.every((value, i) => value === [400, 499][i])) ? 'var(--warn)' : '' }}>
                    Client
                </button>
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer" onClick={selectServerErrorStatus} style={{ color: Array.isArray(filterStatus) && filterStatus.some(pair => pair.every((value, i) => value === [500, 599][i])) ? 'var(--error)' : '' }}>
                    Server
                </button>
            </div>
            <div className="mt-3">
                {endpoints.map((endpoint, index) => (
                    <button key={index} className="hover:bg-[var(--hover-background)] my-2 rounded w-full relative cursor-pointer flex items-center" title={`Status: ${endpoint.status}`} onClick={() => { selectEndpoint(endpoint.path, endpoint.method, endpoint.status ?? null) }}>
                        <span className="text-sm flex items-center mx-2 z-50 py-[2px] text-[var(--text-muted2)]">
                            <span className="pr-1 font-semibold">
                                {endpoint.count.toLocaleString()}
                            </span>
                            <span className="px-1">
                                {endpoint.method}
                            </span>
                            <span className="px-1 text-left break-words">
                                {endpoint.path ?? ''}
                            </span>
                        </span>

                        <div className="h-full rounded absolute inset-0" style={{
                            width: `${(endpoint.count / endpoints[0].count) * 100}%`,
                            background: getBackground(endpoint.status)
                        }}></div>
                    </button>
                ))}
            </div>
        </div>


    )
}