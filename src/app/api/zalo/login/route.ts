import { NextResponse } from 'next/server'

import { generateCodeChallenge, generateCodeVerifier, usersDb } from '~/lib/db'

const ZALO_APP_ID = process.env.ZALO_APP_ID
const ZALO_REDIRECT_URI = process.env.ZALO_REDIRECT_URI

export async function GET() {
  if (!ZALO_APP_ID || !ZALO_REDIRECT_URI) {
    console.error('Missing ZALO_APP_ID or ZALO_REDIRECT_URI in .env.local')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  // Tạo code_verifier và code_challenge
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = crypto.randomUUID() // Chống CSRF

  // Lưu code_verifier và state vào NeDB để verify sau
  await usersDb.insert({
    codeVerifier,
    state,
    purpose: 'oauth',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Hết hạn sau 10 phút
  })

  // Tạo URL redirect
  const authUrl = `https://oauth.zaloapp.com/v4/permission?app_id=${ZALO_APP_ID}&redirect_uri=${encodeURIComponent(
    ZALO_REDIRECT_URI
  )}&code_challenge=${codeChallenge}&state=${state}`
  console.log('Redirecting to Zalo OAuth:', authUrl)
  return NextResponse.redirect(authUrl)
}
