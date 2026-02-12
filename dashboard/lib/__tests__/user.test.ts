import { describe, it, expect } from 'vitest'
import { getUserId } from '../user'

describe('getUserId', () => {
    it('joins ip and userAgent with :: delimiter', () => {
        expect(getUserId('192.168.1.1', 'Mozilla/5.0')).toBe('192.168.1.1::Mozilla/5.0')
    })

    it('same ip, different user agents produce different ids', () => {
        const id1 = getUserId('1.2.3.4', 'Chrome/121')
        const id2 = getUserId('1.2.3.4', 'Firefox/122')
        expect(id1).not.toBe(id2)
    })

    it('same user agent, different ips produce different ids', () => {
        const id1 = getUserId('1.2.3.4', 'Chrome/121')
        const id2 = getUserId('5.6.7.8', 'Chrome/121')
        expect(id1).not.toBe(id2)
    })

    it('handles empty ip address', () => {
        expect(getUserId('', 'Mozilla/5.0')).toBe('::Mozilla/5.0')
    })

    it('handles empty user agent', () => {
        expect(getUserId('192.168.1.1', '')).toBe('192.168.1.1::')
    })

    it('handles both fields empty', () => {
        expect(getUserId('', '')).toBe('::')
    })
})
