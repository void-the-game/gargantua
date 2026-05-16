import { InMemoryRoomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import { RoomStatus } from '@/shared/types/game-types'

describe('InMemoryRoomStore', () => {
  let store: InMemoryRoomStore

  beforeEach(() => {
    store = new InMemoryRoomStore()
  })

  describe('createRoom', () => {
    it('should create a room with the creator as first player', () => {
      const room = store.createRoom({
        playerId: 'player-1',
        socketId: 'socket-1',
        playerName: 'Alice',
        roomName: "Alice's Room",
        isPrivate: false
      })

      expect(room.id).toBeDefined()
      expect(room.code).toHaveLength(6)
      expect(room.status).toBe(RoomStatus.Waiting)
      expect(room.players).toHaveLength(1)
      expect(room.players[0]).toEqual({
        id: 'player-1',
        socketId: 'socket-1',
        name: 'Alice',
      })
      expect(room.gameState).toBeNull()
    })

    it('should generate unique room codes', () => {
      const room1 = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'A', roomName: 'Room A', isPrivate: false })
      const room2 = store.createRoom({ playerId: 'p2', socketId: 's2', playerName: 'B', roomName: 'Room B', isPrivate: false })

      expect(room1.code).not.toBe(room2.code)
    })
  })

  describe('getRoomById', () => {
    it('should return room by ID', () => {
      const created = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      const found = store.getRoomById(created.id)

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
    })

    it('should return undefined for non-existent ID', () => {
      expect(store.getRoomById('non-existent')).toBeUndefined()
    })
  })

  describe('getRoomByCode', () => {
    it('should return room by code', () => {
      const created = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      const found = store.getRoomByCode(created.code)

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
    })

    it('should return undefined for non-existent code', () => {
      expect(store.getRoomByCode('XXXXXX')).toBeUndefined()
    })
  })

  describe('getRoomByPlayerId', () => {
    it('should return room by player ID', () => {
      const created = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      const found = store.getRoomByPlayerId('p1')

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
    })

    it('should return undefined for unknown player', () => {
      expect(store.getRoomByPlayerId('unknown')).toBeUndefined()
    })
  })

  describe('addPlayer', () => {
    it('should add a player to the room', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      const updated = store.addPlayer({ roomId: room.id, playerId: 'p2', socketId: 's2', playerName: 'Bob' })

      expect(updated).toBeDefined()
      expect(updated!.players).toHaveLength(2)
      expect(updated!.players[1].name).toBe('Bob')
    })

    it('should return undefined for non-existent room', () => {
      expect(store.addPlayer({ roomId: 'fake', playerId: 'p1', socketId: 's1', playerName: 'A' })).toBeUndefined()
    })
  })

  describe('removePlayer', () => {
    it('should remove a player from the room', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      store.addPlayer({ roomId: room.id, playerId: 'p2', socketId: 's2', playerName: 'Bob' })

      const updated = store.removePlayer(room.id, 'p1')

      expect(updated).toBeDefined()
      expect(updated!.players).toHaveLength(1)
      expect(updated!.players[0].id).toBe('p2')
    })

    it('should destroy room when last player leaves', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      const result = store.removePlayer(room.id, 'p1')

      expect(result).toBeUndefined()
      expect(store.getRoomById(room.id)).toBeUndefined()
      expect(store.getRoomByCode(room.code)).toBeUndefined()
    })

    it('should clean up player-to-room mapping', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      store.addPlayer({ roomId: room.id, playerId: 'p2', socketId: 's2', playerName: 'Bob' })
      store.removePlayer(room.id, 'p1')

      expect(store.getRoomByPlayerId('p1')).toBeUndefined()
      expect(store.getRoomByPlayerId('p2')).toBeDefined()
    })
  })

  describe('updatePlayerSocketId', () => {
    it('should update socket ID for reconnection', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      store.updatePlayerSocketId('p1', 'new-socket')

      const updated = store.getRoomById(room.id)
      expect(updated!.players[0].socketId).toBe('new-socket')
    })

    it('should return undefined for unknown player', () => {
      expect(store.updatePlayerSocketId('unknown', 'x')).toBeUndefined()
    })
  })

  describe('updateRoomStatus', () => {
    it('should update room status', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      store.updateRoomStatus(room.id, RoomStatus.InProgress)

      const updated = store.getRoomById(room.id)
      expect(updated!.status).toBe(RoomStatus.InProgress)
    })
  })

  describe('isPlayerInRoom', () => {
    it('should return true for player in room', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      expect(store.isPlayerInRoom('p1', room.id)).toBe(true)
    })

    it('should return false for player not in room', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      expect(store.isPlayerInRoom('p2', room.id)).toBe(false)
    })
  })

  describe('clearRoom', () => {
    it('should remove room and all player mappings', () => {
      const room = store.createRoom({ playerId: 'p1', socketId: 's1', playerName: 'Alice', roomName: 'Room', isPrivate: false })
      store.addPlayer({ roomId: room.id, playerId: 'p2', socketId: 's2', playerName: 'Bob' })

      store.clearRoom(room.id)

      expect(store.getRoomById(room.id)).toBeUndefined()
      expect(store.getRoomByCode(room.code)).toBeUndefined()
      expect(store.getRoomByPlayerId('p1')).toBeUndefined()
      expect(store.getRoomByPlayerId('p2')).toBeUndefined()
      expect(store.getRoomCount()).toBe(0)
    })
  })
})
