import { Server, Socket } from 'socket.io'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import { ProfileModel } from '@/infrastructure/models/ProfileModel'
import {
  SocketEvents,
  RoomCreatePayload,
  RoomJoinPayload,
  SocketErrorPayload,
} from '@/shared/types/socket-events'
import {
  roomFull,
  roomNotFound,
  playerAlreadyInRoom,
  roomNotWaiting,
  isGameError,
} from '@/shared/errors/GameError'
import { RoomStatus } from '@/shared/types/game-types'

const MAX_PLAYERS_PER_ROOM = 4
const disconnectTimers = new Map<string, NodeJS.Timeout>()

const safeAvatarUrl = (url?: string): string => {
  if (!url || !url.startsWith('https://')) return ''
  return url
}

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on(
    SocketEvents.ROOM_CREATE,
    async (
      payload: RoomCreatePayload,
      callback?: (response: unknown) => void
    ) => {
      try {
        const { playerName, roomName, isPrivate } = payload
        const userId = socket.data.userId
        const playerId = userId || socket.id

        let profile = null
        if (userId) {
          try {
            profile = await ProfileModel.findOne({ userId }).lean()
          } catch (e) {
            console.log(`[room] ROOM_CREATE profile error for userId: ${userId}`)
          }
        }

        if (!profile) {
          profile = await ProfileModel.findOne(
            { nickname: playerName },
            { avatar: 1 }
          ).lean()
        }
        const avatar = safeAvatarUrl(profile?.avatar)

        const rawRoomName = typeof roomName === 'string' ? roomName.trim() : ''
        const finalRoomName = rawRoomName.substring(0, 30) || `${playerName}'s Room`
        const isRoomPrivate = isPrivate ?? false

        const room = roomStore.createRoom({
          playerId,
          socketId: socket.id,
          playerName,
          roomName: finalRoomName,
          isPrivate: isRoomPrivate,
          avatar,
          hostId: playerId
        })

        socket.data.playerName = playerName
        socket.data.roomId = room.id
        socket.data.isHost = true

        socket.join(room.id)

        console.log(
          `[room] created room ${room.code} by ${playerName} (${playerId})`
        )

        const response = {
          roomId: room.id,
          code: room.code,
        }

        if (callback) {
          callback(response)
        }

        socket.emit(SocketEvents.ROOM_CREATED, response)
      } catch (error) {
        emitError(socket, error)
      }
    }
  )

  socket.on(
    SocketEvents.ROOM_JOIN,
    async (
      payload: RoomJoinPayload,
      callback?: (response: unknown) => void
    ) => {
      try {
        const { code, playerName } = payload
        const userId = socket.data.userId
        const playerId = userId || socket.id

        const room = roomStore.getRoomByCode(code)
        if (!room) {
          throw roomNotFound()
        }

        if (room.status !== RoomStatus.Waiting) {
          throw roomNotWaiting()
        }

        if (roomStore.isPlayerInRoom(playerId, room.id)) {
          throw playerAlreadyInRoom()
        }

        if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
          throw roomFull()
        }

        let profile = null
        if (userId) {
          try {
            profile = await ProfileModel.findOne({ userId }).lean()
          } catch (e) {
            console.log(`[room] ROOM_JOIN profile error for userId: ${userId}`)
          }
        }

        if (!profile) {
          profile = await ProfileModel.findOne(
            { nickname: playerName },
            { avatar: 1 }
          ).lean()
        }

        const avatar = safeAvatarUrl(profile?.avatar)

        roomStore.addPlayer({
          roomId: room.id,
          playerId,
          socketId: socket.id,
          playerName,
          avatar
        })

        socket.data.playerName = playerName
        socket.data.roomId = room.id
        socket.data.isHost = false

        socket.join(room.id)

        console.log(
          `[room] ${playerName} (${playerId}) joined room ${room.code}`
        )

        const playerList = room.players.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar ?? '',
        }))

        io.to(room.id).emit(SocketEvents.ROOM_PLAYER_JOINED, {
          playerId,
          playerName,
          players: playerList,
        })

        if (callback) {
          callback({
            roomId: room.id,
            code: room.code,
            players: playerList,
          })
        }
      } catch (error) {
        emitError(socket, error)
      }
    }
  )

  socket.on(SocketEvents.ROOM_LEAVE, () => {
    handlePlayerLeave(io, socket)
  })

  socket.on('disconnect', () => {
    const playerId = socket.data.userId || socket.id
    const timer = setTimeout(() => {
      // Check if player reconnected with a different socket (if userId was stable)
      const currentRoom = roomStore.getRoomByPlayerId(playerId)
      const isReconnected = currentRoom?.players.some(p => p.id === playerId && io.sockets.sockets.has(p.socketId))

      if (!isReconnected) {
        handlePlayerLeave(io, socket)
      }
      disconnectTimers.delete(playerId)
    }, 60_000)

    disconnectTimers.set(playerId, timer)
  })
}

function handlePlayerLeave(io: Server, socket: Socket): void {
  const playerId = socket.data.userId || socket.id
  const room = roomStore.getRoomByPlayerId(playerId)

  if (!room) return

  const player = room.players.find((p) => p.id === playerId)
  const playerName = player?.name ?? 'Unknown'

  const updatedRoom = roomStore.removePlayer(room.id, playerId)

  socket.leave(room.id)

  console.log(`[room] ${playerName} (${playerId}) left room ${room.code}`)

  if (updatedRoom) {
    const playerList = updatedRoom.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar ?? '',
    }))

    io.to(room.id).emit(SocketEvents.ROOM_PLAYER_LEFT, {
      playerId,
      players: playerList,
    })
  } else {
    console.log(`[room] room ${room.code} destroyed (empty)`)
  }
}

function emitError(socket: Socket, error: unknown): void {
  if (isGameError(error)) {
    const payload: SocketErrorPayload = {
      code: error.code,
      message: error.message,
    }
    socket.emit(SocketEvents.ERROR, payload)
  } else {
    console.error('[room] unexpected error:', error)
    socket.emit(SocketEvents.ERROR, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    })
  }
}
