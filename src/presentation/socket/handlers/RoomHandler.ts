import { Server, Socket } from 'socket.io'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
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

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on(
    SocketEvents.ROOM_CREATE,
    (payload: RoomCreatePayload, callback?: (response: unknown) => void) => {
      try {
        const { playerName } = payload
        const playerId = socket.id

        const room = roomStore.createRoom(playerId, socket.id, playerName)

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
    (payload: RoomJoinPayload, callback?: (response: unknown) => void) => {
      try {
        const { code, playerName } = payload
        const playerId = socket.id

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

        roomStore.addPlayer(room.id, playerId, socket.id, playerName)

        socket.join(room.id)

        console.log(
          `[room] ${playerName} (${playerId}) joined room ${room.code}`
        )

        const playerList = room.players.map((p) => ({
          id: p.id,
          name: p.name,
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
    handlePlayerLeave(io, socket)
  })
}

function handlePlayerLeave(io: Server, socket: Socket): void {
  const playerId = socket.id
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
