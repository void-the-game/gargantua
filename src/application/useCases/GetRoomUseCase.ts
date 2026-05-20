import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'

export class GetRoomUseCase {
  async execute(code: string) {
    if (!code || typeof code !== 'string') {
      return null
    }

    const room = roomStore.getRoomByCode(code.toUpperCase())

    if (!room) {
      return null
    }

    const host = room.players.find((p) => p.id === room.hostId)

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      isPrivate: room.isPrivate,
      status: room.status,
      playersCount: room.players.length,
      hostName: host?.name || room.players[0]?.name || 'Unknown',
      createdAt: room.createdAt,
    }
  }
}
