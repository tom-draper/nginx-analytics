import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { password, usingFileUpload } from './environment'

export const AUTH_COOKIE = 'auth_token'
const SESSION_TTL_SECONDS = 60 * 60

function sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionToken(secret: string, now = Date.now()): string {
    const payload = String(Math.floor(now / 1000) + SESSION_TTL_SECONDS)
    return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): boolean {
    if (!token) return false
    const [expiresAt, signature, ...extra] = token.split('.')
    if (!expiresAt || !signature || extra.length > 0 || !/^\d+$/.test(expiresAt)) return false
    if (Number(expiresAt) <= Math.floor(now / 1000)) return false

    const expected = sign(expiresAt, secret)
    if (signature.length !== expected.length) return false
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function passwordsMatch(provided: string, expected: string): boolean {
    if (provided.length !== expected.length) return false
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
}

export function isDashboardAuthEnabled(): boolean {
    return Boolean(password) && !usingFileUpload
}

export function requireDashboardAuth(request: NextRequest): NextResponse | null {
    if (!isDashboardAuthEnabled()) return null
    if (verifySessionToken(request.cookies.get(AUTH_COOKIE)?.value, password!)) return null
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
