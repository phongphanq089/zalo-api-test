/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import crypto from 'crypto'
import { usersDb } from '~/lib/db'

export async function GET() {
  try {
    const qrToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // Hết hạn sau 5 phút

    // Lưu QR token vào NeDB
    await usersDb.insert({
      token: qrToken,
      purpose: 'register_or_login',
      expiresAt,
      used: false,
    })

    // Tạo QR code
    const qrData = `https://your-miniapp.zalo.me/auth?token=${qrToken}`
    const qrCode = await QRCode.toDataURL(qrData)

    return NextResponse.json({ success: true, qrCode })
  } catch (error: any) {
    console.error('Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}
