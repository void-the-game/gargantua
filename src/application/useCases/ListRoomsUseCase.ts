import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'

export interface ListRoomsParams {
  page: number
  limit: number
  search: string
}

export class ListRoomsUseCase {
  async execute(params: ListRoomsParams) {
    const { page, limit, search } = params

    let rooms = roomStore.getAllRooms()

    // Filter by name if search query is provided
    if (search) {
      rooms = rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    }

    // Sort by creation date (newest first)
    rooms.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    const totalItems = rooms.length
    const totalPages = Math.ceil(totalItems / limit)
    const startIndex = (page - 1) * limit
    const paginatedRooms = rooms.slice(startIndex, startIndex + limit)

    const formattedRooms = paginatedRooms.map((room) => ({
      id: room.id,
      name: room.name,
      isPrivate: room.isPrivate,
      code: room.isPrivate ? undefined : room.code,
      status: room.status,
      playersCount: room.players.length,
      hostName: room.players[0]?.name || 'Unknown',
      createdAt: room.createdAt,
    }))

    return {
      data: formattedRooms,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    }
  }
}
