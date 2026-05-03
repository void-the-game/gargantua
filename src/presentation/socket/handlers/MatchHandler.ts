import { Server, Socket } from 'socket.io'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import { SocketEvents, MatchStartPayload } from '@/shared/types/socket-events'
import {
  GameState,
  GamePhase,
  RoomStatus,
  Player,
} from '@/shared/types/game-types'
import {
  notEnoughPlayers,
  matchAlreadyStarted,
  roomNotFound,
  isGameError,
} from '@/shared/errors/GameError'
import { buildDeck, shuffleDeck, dealCards, pickStartingPlayer } from '@/application/game/DeckBuilder'
import { broadcastStateUpdate } from './StateHandler'

const MIN_PLAYERS = 2

export function registerMatchHandlers(io: Server, socket: Socket): void {
  socket.on(
    SocketEvents.MATCH_START,
    (payload: MatchStartPayload) => {
      try {
        const { roomId } = payload
        const room = roomStore.getRoomById(roomId)

        if (!room) {
          throw roomNotFound()
        }

        if (room.status !== RoomStatus.Waiting) {
          throw matchAlreadyStarted()
        }

        if (room.players.length < MIN_PLAYERS) {
          throw notEnoughPlayers()
        }

        // Build and shuffle the deck
        const deck = shuffleDeck(buildDeck())

        // Create player entities with full game state
        const players: Player[] = room.players.map((p) => ({
          id: p.id,
          socketId: p.socketId,
          name: p.name,
          hand: [],
          isEliminated: false,
          canReturn: false,
        }))

        // Deal 7 cards to each player
        dealCards(players, deck)

        // Pick starting player and direction
        const { startIndex, direction } = pickStartingPlayer(players.length)

        // Create initial game state
        const gameState: GameState = {
          roomId,
          players,
          deck,
          discardPile: [],
          currentTurnIndex: startIndex,
          direction,
          turnNumber: 1,
          phase: GamePhase.Play,
          pendingInterrupt: null,
          blockPurchaseFlag: false,
          hasPlayedCardThisTurn: false,
          pendingDiscard: null
        }

        // Update room
        roomStore.updateRoomStatus(roomId, RoomStatus.InProgress)
        roomStore.setGameState(roomId, gameState)

        console.log(
          `[match] started in room ${room.code} with ${players.length} players. ` +
          `Starting: ${players[startIndex].name}, Direction: ${direction}`
        )

        // Broadcast initial state to all players (filtered views)
        broadcastStateUpdate(io, roomId, gameState)
      } catch (error) {
        if (isGameError(error)) {
          socket.emit(SocketEvents.ERROR, {
            code: error.code,
            message: error.message,
          })
        } else {
          console.error('[match] unexpected error:', error)
          socket.emit(SocketEvents.ERROR, {
            code: 'INTERNAL_ERROR',
            message: 'Failed to start match',
          })
        }
      }
    }
  )
}
