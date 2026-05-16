import { ListRoomsUseCase } from './ListRoomsUseCase'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import { RoomStatus } from '@/shared/types/game-types'

jest.mock('@/infrastructure/stores/InMemoryRoomStore', () => ({
  roomStore: {
    getAllRooms: jest.fn(),
  },
}))

describe('ListRoomsUseCase', () => {
  let listRoomsUseCase: ListRoomsUseCase

  beforeEach(() => {
    listRoomsUseCase = new ListRoomsUseCase()
    jest.clearAllMocks()
  })

  const mockRooms = [
    {
      id: '1',
      code: 'AAAAAA',
      name: 'Room 1',
      isPrivate: false,
      status: RoomStatus.Waiting,
      createdAt: new Date('2026-05-16T10:00:00Z'),
      players: [{ id: 'p1', name: 'Player 1', socketId: 's1' }],
      gameState: null,
    },
    {
      id: '2',
      code: 'BBBBBB',
      name: 'Secret Room',
      isPrivate: true,
      status: RoomStatus.InProgress,
      createdAt: new Date('2026-05-16T11:00:00Z'),
      players: [
        { id: 'p2', name: 'Player 2', socketId: 's2' },
        { id: 'p3', name: 'Player 3', socketId: 's3' },
      ],
      gameState: null,
    },
  ]

  it('should list all rooms correctly with pagination', async () => {
    ; (roomStore.getAllRooms as jest.Mock).mockReturnValue(mockRooms)

    const result = await listRoomsUseCase.execute({ page: 1, limit: 10, search: '' })

    expect(result.pagination.totalItems).toBe(2)
    expect(result.data).toHaveLength(2)

    expect(result.data[0].id).toBe('2')
    expect(result.data[1].id).toBe('1')

    expect(result.data[0].code).toBeUndefined()
    expect(result.data[1].code).toBe('AAAAAA')

    expect(result.data[0].playersCount).toBe(2)
    expect(result.data[1].playersCount).toBe(1)
  })

  it('should filter rooms by search string', async () => {
    ; (roomStore.getAllRooms as jest.Mock).mockReturnValue(mockRooms)

    const result = await listRoomsUseCase.execute({ page: 1, limit: 10, search: 'secret' })

    expect(result.pagination.totalItems).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('Secret Room')
  })

  it('should handle pagination correctly', async () => {
    ; (roomStore.getAllRooms as jest.Mock).mockReturnValue(mockRooms)

    const result = await listRoomsUseCase.execute({ page: 2, limit: 1, search: '' })

    expect(result.pagination.totalItems).toBe(2)
    expect(result.pagination.totalPages).toBe(2)
    expect(result.pagination.page).toBe(2)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('1')
  })
})
