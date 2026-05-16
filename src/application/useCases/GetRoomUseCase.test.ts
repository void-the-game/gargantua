import { GetRoomUseCase } from './GetRoomUseCase'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import { RoomStatus } from '@/shared/types/game-types'

jest.mock('@/infrastructure/stores/InMemoryRoomStore', () => ({
  roomStore: {
    getRoomByCode: jest.fn(),
  },
}))

describe('GetRoomUseCase', () => {
  let getRoomUseCase: GetRoomUseCase

  beforeEach(() => {
    getRoomUseCase = new GetRoomUseCase()
    jest.clearAllMocks()
  })

  it('should return null if room is not found', async () => {
    ;(roomStore.getRoomByCode as jest.Mock).mockReturnValue(undefined)

    const result = await getRoomUseCase.execute('INVALID')

    expect(result).toBeNull()
    expect(roomStore.getRoomByCode).toHaveBeenCalledWith('INVALID')
  })

  it('should return the formatted room details if found', async () => {
    const mockRoom = {
      id: '1',
      code: 'VALIDC',
      name: 'Test Room',
      isPrivate: false,
      status: RoomStatus.Waiting,
      createdAt: new Date('2026-05-16T10:00:00Z'),
      players: [{ id: 'p1', name: 'Host Name', socketId: 's1' }],
      gameState: null,
    }

    ;(roomStore.getRoomByCode as jest.Mock).mockReturnValue(mockRoom)

    const result = await getRoomUseCase.execute('validc') // lowercase should be uppercase

    expect(result).toEqual({
      id: '1',
      code: 'VALIDC',
      name: 'Test Room',
      isPrivate: false,
      status: RoomStatus.Waiting,
      playersCount: 1,
      hostName: 'Host Name',
      createdAt: mockRoom.createdAt,
    })
    
    // Check that it upper-cases the code
    expect(roomStore.getRoomByCode).toHaveBeenCalledWith('VALIDC')
  })

  it('should handle room with no players gracefully', async () => {
    const mockRoom = {
      id: '2',
      code: 'EMPTYR',
      name: 'Empty Room',
      isPrivate: true,
      status: RoomStatus.Waiting,
      createdAt: new Date(),
      players: [],
      gameState: null,
    }

    ;(roomStore.getRoomByCode as jest.Mock).mockReturnValue(mockRoom)

    const result = await getRoomUseCase.execute('EMPTYR')

    expect(result?.playersCount).toBe(0)
    expect(result?.hostName).toBe('Unknown')
  })
})
