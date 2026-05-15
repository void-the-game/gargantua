import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import { socketCorsOrigin } from '@/config/vars'
import { registerRoomHandlers } from './handlers/RoomHandler'
import { registerMatchHandlers } from './handlers/MatchHandler'
import { registerGameActionHandlers } from './handlers/GameActionHandler'
import { registerStateHandlers } from './handlers/StateHandler'
import { registerInterruptHandlers } from './handlers/InterruptHandler'

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: socketCorsOrigin,
      methods: ['GET', 'POST'],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 60 * 1000, // 1 minute (matches RoomHandler grace period)
      skipMiddlewares: true,
    },
  })

  io.on('connection', (socket) => {
    if (socket.recovered) {
      console.log(`[socket] recovered session: ${socket.id}`)
    } else {
      console.log(`[socket] connected: ${socket.id}`)
    }

    // Register all handlers
    registerRoomHandlers(io, socket)
    registerMatchHandlers(io, socket)
    registerGameActionHandlers(io, socket)
    registerStateHandlers(io, socket)
    registerInterruptHandlers(io, socket)

    socket.on('disconnect', (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`)
    })
  })

  console.log('[socket] Socket.IO server initialized')

  return io
}
