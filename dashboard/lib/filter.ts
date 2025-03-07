import { Period } from "./period";

export type Filter = {
    period: Period
}

export const newFilter = () => {
    const filter: Filter = {
        period: 'week'
    }
    return filter;
}