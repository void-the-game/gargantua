import crypto from 'crypto'
import { Room, RoomStatus } from '@/shared/types/game-types'

function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return code
}

export class InMemoryRoomStore {
  private rooms: Map<string, Room> = new Map()
  private codeToRoomId: Map<string, string> = new Map()
  private playerToRoomId: Map<string, string> = new Map()

  createRoom(
    playerId: string,
    socketId: string,
    playerName: string,
    avatar?: string
  ): Room {
    const id = crypto.randomUUID()
    const code = generateRoomCode()

    const room: Room = {
      id,
      code,
      players: [{ id: playerId, socketId, name: playerName, avatar }],
      status: RoomStatus.Waiting,
      gameState: null,
      createdAt: new Date(),
    }

    this.rooms.set(id, room)
    this.codeToRoomId.set(code, id)
    this.playerToRoomId.set(playerId, id)

    return room
  }

  getRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getRoomByCode(code: string): Room | undefined {
    const roomId = this.codeToRoomId.get(code)
    if (!roomId) return undefined
    return this.rooms.get(roomId)
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    const roomId = this.playerToRoomId.get(playerId)
    if (!roomId) return undefined
    return this.rooms.get(roomId)
  }

  addPlayer(
    roomId: string,
    playerId: string,
    socketId: string,
    playerName: string,
    avatar?: string
  ): Room | undefined {
    const room = this.rooms.get(roomId)
    if (!room) return undefined

    room.players.push({ id: playerId, socketId, name: playerName, avatar })
    this.playerToRoomId.set(playerId, roomId)

    return room
  }

  removePlayer(roomId: string, playerId: string): Room | undefined {
    const room = this.rooms.get(roomId)
    if (!room) return undefined

    room.players = room.players.filter((p) => p.id !== playerId)
    this.playerToRoomId.delete(playerId)

    // Destroy room if empty
    if (room.players.length === 0) {
      this.rooms.delete(roomId)
      this.codeToRoomId.delete(room.code)
      return undefined
    }

    return room
  }

  updatePlayerSocketId(
    playerId: string,
    newSocketId: string
  ): Room | undefined {
    const room = this.getRoomByPlayerId(playerId)
    if (!room) return undefined

    const player = room.players.find((p) => p.id === playerId)
    if (player) {
      player.socketId = newSocketId
    }

    return room
  }

  updateRoomStatus(roomId: string, status: RoomStatus): void {
    const room = this.rooms.get(roomId)
    if (room) {
      room.status = status
    }
  }

  setGameState(roomId: string, gameState: Room['gameState']): void {
    const room = this.rooms.get(roomId)
    if (room) {
      room.gameState = gameState
    }
  }

  isPlayerInRoom(playerId: string, roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    return room.players.some((p) => p.id === playerId)
  }

  getRoomCount(): number {
    return this.rooms.size
  }

  clearRoom(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    for (const player of room.players) {
      this.playerToRoomId.delete(player.id)
    }

    this.codeToRoomId.delete(room.code)
    this.rooms.delete(roomId)
  }
}

// Singleton instance
export const roomStore = new InMemoryRoomStore()
