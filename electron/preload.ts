import { contextBridge, ipcRenderer } from 'electron'
import type { DeviceHubApi } from '../src/shared/types'

const api: DeviceHubApi = {
  reminders: {
    list: () => ipcRenderer.invoke('reminders:list'),
    create: (input) => ipcRenderer.invoke('reminders:create', input),
    update: (id, updates) => ipcRenderer.invoke('reminders:update', id, updates),
    remove: (id) => ipcRenderer.invoke('reminders:remove', id),
  },
  goals: {
    list: () => ipcRenderer.invoke('goals:list'),
    create: (input) => ipcRenderer.invoke('goals:create', input),
    update: (id, updates) => ipcRenderer.invoke('goals:update', id, updates),
    logProgress: (id, delta, note) => ipcRenderer.invoke('goals:logProgress', id, delta, note),
    history: (id) => ipcRenderer.invoke('goals:history', id),
    remove: (id) => ipcRenderer.invoke('goals:remove', id),
  },
  budget: {
    listCategories: () => ipcRenderer.invoke('budget:listCategories'),
    createCategory: (input) => ipcRenderer.invoke('budget:createCategory', input),
    removeCategory: (id) => ipcRenderer.invoke('budget:removeCategory', id),
    listTransactions: (month) => ipcRenderer.invoke('budget:listTransactions', month),
    createTransaction: (input) => ipcRenderer.invoke('budget:createTransaction', input),
    removeTransaction: (id) => ipcRenderer.invoke('budget:removeTransaction', id),
    summary: (month) => ipcRenderer.invoke('budget:summary', month),
  },
  canvas: {
    getSettings: () => ipcRenderer.invoke('canvas:getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('canvas:saveSettings', settings),
    sync: () => ipcRenderer.invoke('canvas:sync'),
    listCached: () => ipcRenderer.invoke('canvas:listCached'),
  },
  notifications: {
    getGoogleAuthStatus: () => ipcRenderer.invoke('notifications:getGoogleAuthStatus'),
    saveGoogleCredentials: (clientId, clientSecret) =>
      ipcRenderer.invoke('notifications:saveGoogleCredentials', clientId, clientSecret),
    connectGoogle: () => ipcRenderer.invoke('notifications:connectGoogle'),
    disconnectGoogle: () => ipcRenderer.invoke('notifications:disconnectGoogle'),
    getDigest: () => ipcRenderer.invoke('notifications:getDigest'),
    refreshDigest: () => ipcRenderer.invoke('notifications:refreshDigest'),
  },
  system: {
    notify: (title, body) => ipcRenderer.invoke('system:notify', title, body),
  },
}

contextBridge.exposeInMainWorld('api', api)
