/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'

export default function Login() {
  const [user, setUser] = useState(null)
  const [qrCode, setQrCode] = useState(null)

  // Gọi API để lấy QR code
  const fetchQrCode = async () => {
    try {
      const response = await fetch('/api/zalo/qr')
      const data = await response.json()
      if (data.success) {
        setQrCode(data.qrCode)
      }
    } catch (error) {
      console.error('Error fetching QR:', error)
    }
  }

  const handleLogin = () => {
    window.location.href = '/api/zalo/login'
  }

  // Kiểm tra callback từ Zalo
  useEffect(() => {
    const checkCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('code')) {
        try {
          const response = await fetch(
            '/api/zalo/callback?' + urlParams.toString()
          )
          const data = await response.json()
          if (data.success) {
            setUser(data.user)
            fetchQrCode() // Lấy QR code sau khi đăng nhập
          }
        } catch (error) {
          console.error('Error:', error)
        }
      }
    }
    checkCallback()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Zalo OAuth Login</h1>
      {!user ? (
        <button
          onClick={handleLogin}
          className='bg-amber-600 p-2 rounded-2xl cursor-pointer'
        >
          Đăng nhập bằng Zalo
        </button>
      ) : (
        <div>
          <p>Đăng nhập thành công!</p>
          {/* <p>User ID: {user.zaloUserId}</p>
          <p>Name: {user.name}</p>
          <img src={user.avatar} alt='Avatar' width={100} /> */}
          {qrCode && (
            <div>
              <h2>QR Code để đăng nhập Mini App</h2>
              <img src={qrCode} alt='QR Code' />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
