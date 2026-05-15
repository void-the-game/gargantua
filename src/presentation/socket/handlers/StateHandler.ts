import { Server, Socket } from 'socket.io'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import {
  SocketEvents,
  StateRequestPayload,
  InterruptAvailablePayload,
} from '@/shared/types/socket-events'
import {
  GameState,
  PlayerView,
  HiddenHand,
  Player,
} from '@/shared/types/game-types'
import { Card, CardType } from '@/shared/types/card-types'
import { noActiveMatch, isGameError } from '@/shared/errors/GameError'

/**
 * Create a filtered view of the game state for a specific player.
 * Hides other players' hands — only shows card count.
 */
export function createPlayerView(
  state: GameState,
  playerId: string
): PlayerView {
  return {
    roomId: state.roomId,
    players: state.players.map((p) => {
      if (p.id === playerId) {
        // Show full hand for the viewing player
        return {
          id: p.id,
          socketId: p.socketId,
          name: p.name,
          avatar: p.avatar ?? '',
          hand: p.hand,
          isEliminated: p.isEliminated,
          canReturn: p.canReturn,
        }
      }
      // Hide hand for opponents
      return {
        id: p.id,
        socketId: p.socketId,
        name: p.name,
        avatar: p.avatar ?? '',
        hand: { count: p.hand.length } as HiddenHand,
        isEliminated: p.isEliminated,
        canReturn: p.canReturn,
      }
    }),
    deck: { remaining: state.deck.length },
    discardPile: state.discardPile,
    currentTurnIndex: state.currentTurnIndex,
    direction: state.direction,
    turnNumber: state.turnNumber,
    phase: state.phase,
    pendingInterrupt: state.pendingInterrupt
      ? {
        type: state.pendingInterrupt.type,
        attackerId: state.pendingInterrupt.attackerId,
        targetId: state.pendingInterrupt.targetId,
        cardId: state.pendingInterrupt.cardId,
        timeoutMs: state.pendingInterrupt.timeoutMs,
      }
      : null,
    pendingDiscard: state.pendingDiscard,
    blockPurchaseFlag: state.blockPurchaseFlag,
    hasPlayedCardThisTurn: state.hasPlayedCardThisTurn,
  }
}

/**
 * Broadcast state:update to all players in a room.
 * Each player receives their own filtered view.
 */
export function broadcastStateUpdate(
  io: Server,
  roomId: string,
  state: GameState
): void {
  const room = roomStore.getRoomById(roomId)
  if (!room) return

  // Send personalized state to each player
  for (const player of state.players) {
    const view = createPlayerView(state, player.id)
    io.to(player.socketId).emit(SocketEvents.STATE_UPDATE, view)
  }
}

/**
 * Emit interrupt:available to the target player.
 */
export function emitInterruptAvailable(
  io: Server,
  roomId: string,
  state: GameState
): void {
  if (!state.pendingInterrupt) return

  const { attackerId, targetId, timeoutMs, type, cardId } = state.pendingInterrupt
  const attacker = state.players.find((p) => p.id === attackerId)

  if (!attacker) return

  const payload = {
    attackerId,
    attackerName: attacker.name,
    cardType: state.discardPile[state.discardPile.length - 1]?.type ?? CardType.Essence,
    timeoutMs,
    type,
    cardId,
  }

  if (targetId) {
    const target = state.players.find((p) => p.id === targetId)
    if (target?.socketId) {
      io.to(target.socketId).emit(SocketEvents.INTERRUPT_AVAILABLE, payload)
    }
  } else {
    // Notify all opponents
    for (const player of state.players) {
      if (player.id !== attackerId && !player.isEliminated && player.socketId) {
        io.to(player.socketId).emit(SocketEvents.INTERRUPT_AVAILABLE, payload)
      }
    }
  }
}

/**
 * Register state-related handlers.
 */
export function registerStateHandlers(io: Server, socket: Socket): void {
  socket.on(
    SocketEvents.STATE_REQUEST,
    (payload: StateRequestPayload) => {
      try {
        const { roomId } = payload
        const room = roomStore.getRoomById(roomId)

        if (!room || !room.gameState) {
          throw noActiveMatch()
        }

        const playerId = socket.id
        const view = createPlayerView(room.gameState, playerId)
        socket.emit(SocketEvents.STATE_UPDATE, view)
      } catch (error) {
        if (isGameError(error)) {
          socket.emit(SocketEvents.ERROR, {
            code: error.code,
            message: error.message,
          })
        } else {
          console.error('[state] unexpected error:', error)
        }
      }
    }
  )
}
