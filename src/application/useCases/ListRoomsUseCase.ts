import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import { RoomStatus } from '@/shared/types/game-types'

export type ListRoomsParams = {
  page?: number
  limit?: number
  search?: string
}

const MAX_LIMIT = 50

export class ListRoomsUseCase {
  async execute({ page, limit, search }: ListRoomsParams) {
    const safePage = page && page > 0 ? page : 1
    const safeLimit = limit && limit > 0 ? Math.min(MAX_LIMIT, limit) : 10
    const searchStr = search || ''

    let rooms = roomStore.getAllRooms()

    if (searchStr) {
      rooms = rooms.filter((r) => r.name.toLowerCase().includes(searchStr.toLowerCase()))
    }

    // Sort: Waiting rooms first, then by creation date (newest first)
    rooms.sort((a, b) => {
      if (a.status === RoomStatus.Waiting && b.status !== RoomStatus.Waiting) return -1
      if (a.status !== RoomStatus.Waiting && b.status === RoomStatus.Waiting) return 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    const totalItems = rooms.length
    const totalPages = Math.ceil(totalItems / safeLimit)
    const startIndex = (safePage - 1) * safeLimit
    const paginatedRooms = rooms.slice(startIndex, startIndex + safeLimit)

    const formattedRooms = paginatedRooms.map((room) => {
      const host = room.players.find((p) => p.id === room.hostId)
      return {
        id: room.id,
        name: room.name,
        isPrivate: room.isPrivate,
        code: room.isPrivate ? undefined : room.code,
        status: room.status,
        playersCount: room.players.length,
        hostName: host?.name || room.players[0]?.name || 'Unknown',
        createdAt: room.createdAt,
      }
    })

    return {
      data: formattedRooms,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages,
      },
    }
  }
}
