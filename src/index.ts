import { createServer } from 'http'
import app from './app'
import { dbConnection } from '@/config/connection'
import { port } from './config/vars'
import { createSocketServer } from '@/presentation/socket/SocketServer'

// Create HTTP server from Express app (required for Socket.IO)
const httpServer = createServer(app)

// Initialize Socket.IO on the same HTTP server
const io = createSocketServer(httpServer)

// Connect to MongoDB when the server starts
dbConnection()

httpServer.listen(port, () => {
  console.log(`[server] listening on port ${port}`)
})

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']
let isShuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`[server] ${signal} received, shutting down...`)

  const timeout = setTimeout(() => {
    console.error('[server] shutdown timeout, forcing exit')
    process.exit(1)
  }, 10000)

  try {
    // Close Socket.IO first (stop accepting new connections)
    await io.close()
    console.log('[server] Socket.IO closed')

    // Close HTTP server (drain in-flight requests)
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()))
    })
    console.log('[server] HTTP server closed')

    clearTimeout(timeout)
    process.exit(0)
  } catch (error) {
    console.error('[server] shutdown error:', error)
    clearTimeout(timeout)
    process.exit(1)
  }
}

for (const signal of signals) {
  process.on(signal, () => shutdown(signal))
}

export { io }
