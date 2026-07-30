import { app, safeStorage } from 'electron'
import { setCryptoAdapter, setDataDir } from '../core/adapters'

export function configureElectronAdapters() {
  setDataDir(app.getPath('userData'))

  setCryptoAdapter({
    encrypt(value) {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(value).toString('base64')
      }
      return `plain:${value}`
    },
    decrypt(stored) {
      if (stored.startsWith('plain:')) return stored.slice('plain:'.length)
      return safeStorage.decryptString(Buffer.from(stored, 'base64'))
    },
  })
}
