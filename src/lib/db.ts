import Datastore from 'nedb-promises'
import CryptoJS from 'crypto-js'

// Khởi tạo NeDB database
const usersDb = Datastore.create({
  filename: './users.db',
  autoload: true,
})

export { usersDb }

// Tạo code_verifier ngẫu nhiên
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

// Tạo code_challenge từ code_verifier
export function generateCodeChallenge(verifier: string): string {
  const hashed = CryptoJS.SHA256(verifier)
  const base64 = hashed.toString(CryptoJS.enc.Base64)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') // base64url encoding
}
