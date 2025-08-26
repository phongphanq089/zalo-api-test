/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { usersDb } from '~/lib/db'

export async function POST(request: Request) {
  const {
    zaloUserId,
    qrToken,
    name = 'Unknown',
    avatar = '',
  } = await request.json()

  try {
    // Nếu có qrToken, kiểm tra tính hợp lệ
    if (qrToken) {
      const qrRecord = await usersDb.findOne({
        token: qrToken,
        used: false,
        expiresAt: { $gt: new Date() },
      })
      if (!qrRecord) {
        return NextResponse.json(
          { error: 'Invalid or expired QR token' },
          { status: 400 }
        )
      }
      await usersDb.update({ token: qrToken }, { $set: { used: true } })
    }

    // Kiểm tra user trong NeDB
    let user = (await usersDb.findOne({ zaloUserId })) as any
    const sessionToken = crypto.randomUUID()

    if (!user) {
      // Đăng ký mới
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
      // Đăng nhập: Cập nhật session
      await usersDb.update(
        { zaloUserId },
        { $set: { sessionToken, lastLogin: new Date(), name, avatar } }
      )
    }

    return NextResponse.json({
      success: true,
      sessionToken,
      user: { zaloUserId, name, avatar },
    })
  } catch (error: any) {
    console.error('Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to authenticate' },
      { status: 500 }
    )
  }
}
