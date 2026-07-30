import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import os from 'node:os'
import { configureServerAdapters } from './adapters'
import { registerAuthRoutes } from './auth'
import { registerApiRoutes } from './routes'
import { checkDueReminders } from '../core/reminderEngine'

const PORT = Number(process.env.PORT ?? 4000)
const DATA_DIR = process.env.DATA_DIR ?? path.join(os.homedir(), '.devicehub')
const PUBLIC_URL = (process.env.PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/+$/, '')
const STATIC_DIR = path.join(__dirname, '..', '..', 'dist')

configureServerAdapters(DATA_DIR)

const app = express()
app.disable('x-powered-by')
app.use(express.json())
app.use(cookieParser())

registerAuthRoutes(app)
registerApiRoutes(app, PUBLIC_URL)

app.use(express.static(STATIC_DIR))
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    next()
    return
  }
  res.sendFile(path.join(STATIC_DIR, 'index.html'))
})

setInterval(() => {
  checkDueReminders()
}, 30_000)
checkDueReminders()

app.listen(PORT, () => {
  console.log(`DeviceHub server listening on port ${PORT}`)
  console.log(`Public URL: ${PUBLIC_URL}`)
  console.log(`Data directory: ${DATA_DIR}`)
  if (!process.env.PUBLIC_URL) {
    console.warn(
      'PUBLIC_URL is not set — defaulting to http://localhost:%d. Set PUBLIC_URL to the address your iPad will actually use (e.g. a Cloudflare Tunnel or LAN URL) before connecting Google, since it must exactly match the redirect URI registered in Google Cloud Console.',
      PORT
    )
  }
})
