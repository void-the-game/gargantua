import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'
import { socketCorsOrigin, jwtSecret } from '@/config/vars'
import { registerRoomHandlers } from './handlers/RoomHandler'
import { registerMatchHandlers } from './handlers/MatchHandler'
import { registerGameActionHandlers } from './handlers/GameActionHandler'
import { registerStateHandlers } from './handlers/StateHandler'
import { registerInterruptHandlers } from './handlers/InterruptHandler'
import { JwtTokenService } from '@/infrastructure/services/JwtTokenService'

const tokenService = new JwtTokenService(jwtSecret)

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

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization']
      
      if (token) {
        const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token
        const { userId, isValid } = await tokenService.verifyToken(cleanToken)
        
        if (isValid) {
          socket.data.userId = userId
          console.log(`[socket] authenticated user: ${userId}`)
        } else {
          console.log(`[socket] invalid token for socket: ${socket.id}`)
        }
      }
      
      next()
    } catch (error) {
      console.error('[socket] auth middleware error:', error)
      next() // Still allow connection, but without userId
    }
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
