/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import axios from 'axios'
import crypto from 'crypto'
import { generateCodeChallenge, generateCodeVerifier, usersDb } from '~/lib/db'

// Lấy biến môi trường
const ZALO_APP_ID = process.env.ZALO_APP_ID
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET
const ZALO_REDIRECT_URI = process.env.ZALO_REDIRECT_URI || ''

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  if (!ZALO_APP_ID || !ZALO_REDIRECT_URI) {
    console.error('Missing ZALO_APP_ID or ZALO_REDIRECT_URI in .env.local')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  // Log để debug App ID
  console.log('Using ZALO_APP_ID:', ZALO_APP_ID)

  // Tạo code_verifier và code_challenge
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = crypto.randomUUID() // Chống CSRF

  if (slug === 'login') {
    await usersDb.insert({
      codeVerifier,
      state,
      purpose: 'oauth',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Hết hạn sau 10 phút
    })

    const authUrl = `https://oauth.zaloapp.com/v4/permission?app_id=${ZALO_APP_ID}&redirect_uri=${encodeURIComponent(
      ZALO_REDIRECT_URI
    )}&code_challenge=${codeChallenge}&state=${state}`
    console.log('Redirecting to Zalo OAuth:', authUrl)
    return NextResponse.redirect(authUrl)
  }

  if (slug === 'callback') {
    // Xử lý callback từ Zalo
    console.log('// Xử lý callback từ Zalo')
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      console.error('Zalo OAuth error:', error, errorDescription)
      return NextResponse.json(
        { error: errorDescription || 'OAuth error' },
        { status: 400 }
      )
    }

    if (!code) {
      console.error('Missing code parameter in callback')
      return NextResponse.json(
        { error: 'Missing code parameter' },
        { status: 400 }
      )
    }

    if (!ZALO_APP_ID || !ZALO_APP_SECRET || !ZALO_REDIRECT_URI) {
      console.error('Missing environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    try {
      // Exchange code lấy access_token
      console.log('Exchanging code for access_token:', code)
      const tokenResponse = await axios.post(
        'https://oauth.zaloapp.com/v4/access_token',
        null,
        {
          params: {
            app_id: ZALO_APP_ID,
            app_secret: ZALO_APP_SECRET,
            code,
            grant_type: 'authorization_code',
          },
        }
      )

      const { access_token, refresh_token, expires_in } = tokenResponse.data
      console.log('Access token received:', access_token)

      // Tạo appsecret_proof
      const appsecret_proof = crypto
        .createHmac('sha256', ZALO_APP_SECRET!)
        .update(access_token)
        .digest('hex')

      // Lấy thông tin người dùng
      const userResponse = await axios.post(
        'https://openapi.zalo.me/v2.0/oa/getprofile',
        { user_id: 'me' },
        {
          headers: {
            access_token,
            appsecret_proof,
          },
        }
      )

      const userData = userResponse.data.data
      const zaloUserId = userData.user_id
      const name = userData.name || 'Unknown'
      const avatar = userData.avatar || ''
      console.log('User info:', { zaloUserId, name, avatar })

      // Lưu vào NeDB
      let user = (await usersDb.findOne({ zaloUserId })) as any
      const sessionToken = crypto.randomUUID()

      if (!user) {
        user = {
          zaloUserId,
          name,
          avatar,
          sessionToken,
          createdAt: new Date(),
          lastLogin: new Date(),
        }
        await usersDb.insert(user)
      } else {
        await usersDb.update(
          { zaloUserId },
          { $set: { sessionToken, lastLogin: new Date(), name, avatar } }
        )
      }

      return NextResponse.json({
        success: true,
        user: { zaloUserId, name, avatar },
        session: {
          sessionToken,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
        },
      })
    } catch (error: any) {
      console.error('Error in callback:', error.response?.data || error.message)
      return NextResponse.json(
        { error: 'Failed to authenticate with Zalo' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ error: 'Invalid route' }, { status: 404 })
}
