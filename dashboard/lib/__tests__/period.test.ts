import { describe, it, expect } from 'vitest'
import { periodStart, getPeriodRange, hoursInRange, getDateRange, type Period } from '../period'
import type { NginxLog } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeLog = (timestamp: Date | null): NginxLog => ({
    ipAddress: '1.1.1.1',
    timestamp: timestamp ? timestamp.getTime() : null,
    method: 'GET',
    path: '/',
    httpVersion: 'HTTP/1.1',
    status: 200,
    responseSize: 100,
    referrer: '-',
    userAgent: '-',
})

// ---------------------------------------------------------------------------
// periodStart
// ---------------------------------------------------------------------------

describe('periodStart', () => {
    it('returns a number for "24 hours"', () => {
        const before = Date.now()
        const result = periodStart('24 hours')
        const after = Date.now()
        expect(typeof result).toBe('number')
        const expectedMs = 24 * 60 * 60 * 1000
        expect(before - result!).toBeGreaterThanOrEqual(expectedMs - 100)
        expect(after - result!).toBeLessThanOrEqual(expectedMs + 100)
    })

    it('returns a number for "week"', () => {
        const before = Date.now()
        const result = periodStart('week')
        expect(typeof result).toBe('number')
        expect(before - result!).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 100)
    })

    it('returns a number for "month"', () => {
        const result = periodStart('month')
        expect(typeof result).toBe('number')
        expect(result!).toBeLessThan(Date.now())
    })

    it('returns a number for "6 months"', () => {
        const result = periodStart('6 months')
        expect(typeof result).toBe('number')
        expect(result!).toBeLessThan(Date.now())
    })

    it('returns null for "all time"', () => {
        expect(periodStart('all time')).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// hoursInRange
// ---------------------------------------------------------------------------

describe('hoursInRange', () => {
    it('returns the correct number of hours', () => {
        const start = new Date('2024-01-01T00:00:00Z')
        const end = new Date('2024-01-02T00:00:00Z')
        expect(hoursInRange(start, end)).toBe(24)
    })

    it('returns 1 for a zero-duration range (avoids division by zero)', () => {
        const t = new Date('2024-01-01T00:00:00Z')
        expect(hoursInRange(t, t)).toBe(1)
    })

    it('returns 1 for a sub-1-hour range', () => {
        const start = new Date('2024-01-01T00:00:00Z')
        const end = new Date('2024-01-01T00:30:00Z')
        expect(hoursInRange(start, end)).toBe(1)
    })

    it('returns fractional hours', () => {
        const start = new Date('2024-01-01T00:00:00Z')
        const end = new Date('2024-01-01T01:30:00Z')
        expect(hoursInRange(start, end)).toBe(1.5)
    })
})

// ---------------------------------------------------------------------------
// getDateRange
// ---------------------------------------------------------------------------

describe('getDateRange', () => {
    it('returns null for empty array', () => {
        expect(getDateRange([])).toBeNull()
    })

    it('returns null for null/undefined input', () => {
        expect(getDateRange(null as unknown as [])).toBeNull()
    })

    it('returns the single timestamp as both start and end', () => {
        const ts = new Date('2024-06-01T12:00:00Z')
        const result = getDateRange([makeLog(ts)])
        expect(result).not.toBeNull()
        expect(result!.start).toBe(ts.getTime())
        expect(result!.end).toBe(ts.getTime())
    })

    it('finds min and max across multiple timestamps', () => {
        const t1 = new Date('2024-01-01T00:00:00Z')
        const t2 = new Date('2024-06-01T00:00:00Z')
        const t3 = new Date('2024-03-15T12:00:00Z')
        const result = getDateRange([makeLog(t1), makeLog(t2), makeLog(t3)])
        expect(result!.start).toBe(t1.getTime())
        expect(result!.end).toBe(t2.getTime())
    })

    it('skips logs with null timestamps', () => {
        const ts = new Date('2024-06-01T12:00:00Z')
        const result = getDateRange([makeLog(null), makeLog(ts), makeLog(null)])
        expect(result!.start).toBe(ts.getTime())
        expect(result!.end).toBe(ts.getTime())
    })

    it('returns null-like range when all timestamps are null', () => {
        // start remains Infinity, end remains -Infinity
        const result = getDateRange([makeLog(null)])
        expect(result!.start).toBe(Infinity)
        expect(result!.end).toBe(-Infinity)
    })
})

// ---------------------------------------------------------------------------
// getPeriodRange
// ---------------------------------------------------------------------------

describe('getPeriodRange', () => {
    it('returns null for "all time" with no data', () => {
        expect(getPeriodRange('all time', [])).toBeNull()
    })

    it('returns data range for "all time" with data', () => {
        const t1 = new Date('2024-01-01T00:00:00Z')
        const t2 = new Date('2024-12-31T00:00:00Z')
        const result = getPeriodRange('all time', [makeLog(t1), makeLog(t2)])
        expect(result).not.toBeNull()
        expect(result!.start.getTime()).toBe(t1.getTime())
        expect(result!.end.getTime()).toBe(t2.getTime())
    })

    it('returns a range with start before now for "24 hours"', () => {
        const before = Date.now()
        const result = getPeriodRange('24 hours', [])
        expect(result).not.toBeNull()
        expect(result!.start.getTime()).toBeLessThan(before)
        expect(result!.end.getTime()).toBeGreaterThanOrEqual(before)
    })

    it('returns a range for "week"', () => {
        const result = getPeriodRange('week', [])
        expect(result).not.toBeNull()
        expect(result!.start.getTime()).toBeLessThan(result!.end.getTime())
    })
})
