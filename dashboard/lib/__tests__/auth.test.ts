import { describe, expect, it } from 'vitest'
import { createSessionToken, passwordsMatch, verifySessionToken } from '../auth'

describe('dashboard sessions', () => {
    const secret = 'test-secret'
    const now = 1_700_000_000_000

    it('accepts a valid signed session', () => {
        expect(verifySessionToken(createSessionToken(secret, now), secret, now)).toBe(true)
    })

    it('rejects forged and expired sessions', () => {
        expect(verifySessionToken('9999999999.invalid', secret, now)).toBe(false)
        expect(verifySessionToken(createSessionToken(secret, now), secret, now + 3_601_000_000)).toBe(false)
    })

    it('requires identical passwords', () => {
        expect(passwordsMatch('correct', 'correct')).toBe(true)
        expect(passwordsMatch('correct', 'incorrect')).toBe(false)
    })
})
