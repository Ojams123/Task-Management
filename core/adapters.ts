// Small injectable seams so core/ (db + integrations) has zero dependency on
// Electron or any particular server framework. Whichever host (electron/ or
// server/) starts up is responsible for calling these setters once before
// anything in core/ touches the database.

export interface CryptoAdapter {
  encrypt(value: string): string
  decrypt(value: string): string
}

let cryptoAdapter: CryptoAdapter | null = null

export function setCryptoAdapter(adapter: CryptoAdapter) {
  cryptoAdapter = adapter
}

export function getCryptoAdapter(): CryptoAdapter {
  if (!cryptoAdapter) throw new Error('Crypto adapter not configured — call setCryptoAdapter() at startup')
  return cryptoAdapter
}

let dataDir: string | null = null

export function setDataDir(dir: string) {
  dataDir = dir
}

export function getDataDir(): string {
  if (!dataDir) throw new Error('Data directory not configured — call setDataDir() at startup')
  return dataDir
}
