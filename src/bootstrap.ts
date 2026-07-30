import { createHttpClient } from './api/httpClient'

// The Electron preload script runs before any renderer JS and assigns
// window.api via contextBridge — so if it's already set at this point, we're
// running inside the desktop app and should leave it untouched. Otherwise
// we're a plain browser tab talking to the DeviceHub server, so install the
// fetch-based implementation of the same interface.
export const IS_ELECTRON = typeof window !== 'undefined' && Boolean(window.api)

if (!IS_ELECTRON) {
  window.api = createHttpClient()
}
