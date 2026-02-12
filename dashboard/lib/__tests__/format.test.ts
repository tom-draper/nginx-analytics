import { describe, it, expect } from 'vitest'
import { formatBytes } from '../format'

describe('formatBytes', () => {
    it('returns "0 Bytes" for 0', () => {
        expect(formatBytes(0)).toBe('0 Bytes')
    })

    it('returns singular "Byte" for 1', () => {
        expect(formatBytes(1)).toBe('1 Byte')
    })

    it('returns "Bytes" for values > 1 below 1 KB', () => {
        expect(formatBytes(500)).toBe('500 Bytes')
    })

    it('formats exactly 1 KB', () => {
        expect(formatBytes(1024)).toBe('1 KB')
    })

    it('formats exactly 1 MB', () => {
        expect(formatBytes(1024 * 1024)).toBe('1 MB')
    })

    it('formats exactly 1 GB', () => {
        expect(formatBytes(1024 ** 3)).toBe('1 GB')
    })

    it('formats fractional KB with default 2 decimals', () => {
        expect(formatBytes(1536)).toBe('1.5 KB')
    })

    it('respects custom decimal places', () => {
        expect(formatBytes(1536, 0)).toBe('2 KB')
    })

    it('treats negative decimals as 0', () => {
        expect(formatBytes(1024, -1)).toBe('1 KB')
    })

    it('formats a large value (1 TB)', () => {
        expect(formatBytes(1024 ** 4)).toBe('1 TB')
    })
})
