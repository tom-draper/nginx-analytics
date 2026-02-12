import { describe, it, expect } from 'vitest'
import { newSettings } from '../settings'

describe('newSettings', () => {
    it('defaults ignore404 to false', () => {
        expect(newSettings().ignore404).toBe(false)
    })

    it('defaults ignoreParams to false', () => {
        expect(newSettings().ignoreParams).toBe(false)
    })

    it('each call returns a new independent object', () => {
        const s1 = newSettings()
        const s2 = newSettings()
        s1.ignore404 = true
        expect(s2.ignore404).toBe(false)
    })
})
