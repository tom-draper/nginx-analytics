import { Period } from "./period";

export type Filter = {
    period: Period,
    location: string | null
    path: string | null
    method: string | null
    status: number | [number, number][] | null
    referrer: string | null
    version: string | null
    client: string | null
    os: string | null
    deviceType: string | null
    hour: number | null
}

export const newFilter = () => {
    const filter: Filter = {
        period: 'week',
        location: null,
        path: null,
        method: null,
        status: null,
        referrer: null,
        version: null,
        client: null,
        os: null,
        deviceType: null,
        hour: null,
    }
    return filter;
}