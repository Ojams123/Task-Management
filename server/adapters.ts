import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { setCryptoAdapter, setDataDir } from '../core/adapters'

/**
 * Resolves the AES key used to encrypt secrets at rest: an explicit
 * DEVICEHUB_SECRET env var wins, otherwise a random key is generated once
 * and persisted (mode 0600) next to the database so restarts keep reading
 * the same encrypted values.
 */
function resolveSecretKey(dataDir: string): Buffer {
  const fromEnv = process.env.DEVICEHUB_SECRET
  if (fromEnv) {
    if (!/^[0-9a-f]{64}$/i.test(fromEnv)) {
      throw new Error('DEVICEHUB_SECRET must be a 64-character hex string (32 bytes). Generate one with: openssl rand -hex 32')
    }
    return Buffer.from(fromEnv, 'hex')
  }

  const keyPath = path.join(dataDir, 'secret.key')
  if (fs.existsSync(keyPath)) {
    return Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'hex')
  }

  const key = crypto.randomBytes(32)
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 })
  return key
}

export function configureServerAdapters(dataDir: string) {
  setDataDir(dataDir)
  const key = resolveSecretKey(dataDir)

  setCryptoAdapter({
    encrypt(value) {
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
      const tag = cipher.getAuthTag()
      return Buffer.concat([iv, tag, encrypted]).toString('base64')
    },
    decrypt(stored) {
      const buf = Buffer.from(stored, 'base64')
      const iv = buf.subarray(0, 12)
      const tag = buf.subarray(12, 28)
      const encrypted = buf.subarray(28)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    },
  })
}
