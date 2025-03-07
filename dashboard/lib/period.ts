
export type Period = '24 hours' | 'week' | 'month' | '6 months' | 'all time';

export const periodStart = (period: Period) => {
    const date = new Date();
    switch (period) {
        case '24 hours':
            date.setDate(date.getHours() - 24)
            return date;
        case 'week':
            date.setDate(date.getDate() - 7)
            return date;
        case 'month':
            date.setDate(date.getMonth() - 1)
            return date;
        case 'month':
            date.setDate(date.getMonth() - 6)
            return date;
        default:
            return null;
    }
}