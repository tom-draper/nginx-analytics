import { Period } from "./period";

export type Filter = {
    period: Period,
    location: string | null
    path: string | null
    method: string | null
    status: number | [number, number] | null
    referrer: string | null
}

export const newFilter = () => {
    const filter: Filter = {
        period: 'week',
        location: null,
        path: null,
        method: null,
        status: null,
        referrer: null,
    }
    return filter;
}