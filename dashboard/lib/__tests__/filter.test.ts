import { describe, it, expect } from 'vitest'
import { newFilter } from '../filter'

describe('newFilter', () => {
    it('defaults to the week period', () => {
        expect(newFilter().period).toBe('week')
    })

    it('initialises all optional fields to null', () => {
        const f = newFilter()
        expect(f.location).toBeNull()
        expect(f.path).toBeNull()
        expect(f.method).toBeNull()
        expect(f.status).toBeNull()
        expect(f.referrer).toBeNull()
    })

    it('each call returns a new independent object', () => {
        const f1 = newFilter()
        const f2 = newFilter()
        f1.location = 'US'
        expect(f2.location).toBeNull()
    })
})
