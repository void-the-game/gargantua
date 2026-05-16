import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'

export class GetRoomUseCase {
  async execute(code: string) {
    const room = roomStore.getRoomByCode(code.toUpperCase())

    if (!room) {
      return null
    }

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      isPrivate: room.isPrivate,
      status: room.status,
      playersCount: room.players.length,
      hostName: room.players[0]?.name || 'Unknown',
      createdAt: room.createdAt,
    }
  }
}
