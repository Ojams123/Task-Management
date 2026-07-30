/// <reference types="vite/client" />

import type { DeviceHubApi } from './shared/types'

declare global {
  interface Window {
    api: DeviceHubApi
  }
}

export {}
