import { Server, Socket } from 'socket.io'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import {
  SocketEvents,
  InterruptPlayPayload,
} from '@/shared/types/socket-events'
import { GamePhase } from '@/shared/types/game-types'
import { CardType } from '@/shared/types/card-types'
import {
  noActiveMatch,
  noInterruptAvailable,
  cardNotInHand,
  cannotNullifyExtraPower,
  isGameError,
} from '@/shared/errors/GameError'
import { executeSteal, executeReflect } from '@/application/game/EffectEngine'
import { checkElimination, checkMatchEnd } from '@/application/game/TurnManager'
import { broadcastStateUpdate } from './StateHandler'

export function registerInterruptHandlers(io: Server, socket: Socket): void {
  socket.on(
    SocketEvents.INTERRUPT_PLAY,
    (payload: InterruptPlayPayload) => {
      try {
        const { roomId, cardId } = payload
        const room = roomStore.getRoomById(roomId)

        if (!room || !room.gameState) {
          throw noActiveMatch()
        }

        const state = room.gameState

        if (!state.pendingInterrupt) {
          throw noInterruptAvailable()
        }

        const { attackerId, targetId, timeoutHandle } = state.pendingInterrupt

        // Verify this is the target player
        const target = state.players.find(
          (p) => p.socketId === socket.id || p.id === socket.id
        )

        if (!target || target.id !== targetId) {
          throw noInterruptAvailable()
        }

        // Find the card in target's hand
        const cardIndex = target.hand.findIndex((c) => c.id === cardId)
        if (cardIndex === -1) {
          throw cardNotInHand()
        }

        const [card] = target.hand.splice(cardIndex, 1)
        state.discardPile.push(card)

        // Clear the timeout
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }

        // Resolve based on card type
        switch (card.type) {
          case CardType.BlockSteal: {
            // Cancel the steal — nothing happens
            console.log(
              `[interrupt] ${target.name} blocked steal from ${attackerId}`
            )
            io.to(roomId).emit(SocketEvents.CARD_PLAYED, {
              playerId: target.id,
              playerName: target.name,
              card: { type: card.type, color: card.color },
              effectDescription: `${target.name} blocked the steal!`,
            })
            break
          }

          case CardType.Reflect: {
            // Reverse the steal
            executeReflect(state, attackerId, targetId, 1)
            console.log(
              `[interrupt] ${target.name} reflected steal back to ${attackerId}`
            )
            io.to(roomId).emit(SocketEvents.CARD_PLAYED, {
              playerId: target.id,
              playerName: target.name,
              card: { type: card.type, color: card.color },
              effectDescription: `${target.name} reflected the steal!`,
            })
            break
          }

          case CardType.Nullify: {
            // Check if the original card was ExtraPower (immune to Nullify)
            const lastPlayed = state.discardPile[state.discardPile.length - 2]
            if (lastPlayed?.type === CardType.ExtraPower) {
              // Put the nullify card back and throw error
              target.hand.push(card)
              state.discardPile.pop()
              throw cannotNullifyExtraPower()
            }

            console.log(
              `[interrupt] ${target.name} nullified card from ${attackerId}`
            )
            io.to(roomId).emit(SocketEvents.CARD_PLAYED, {
              playerId: target.id,
              playerName: target.name,
              card: { type: card.type, color: card.color },
              effectDescription: `${target.name} nullified the card!`,
            })
            break
          }

          default: {
            // Not a valid interrupt card — put it back
            target.hand.push(card)
            state.discardPile.pop()
            throw cardNotInHand()
          }
        }

        // Clear interrupt state
        state.pendingInterrupt = null
        state.phase = GamePhase.Play

        // Check eliminations
        const eliminatedIds = checkElimination(state)
        for (const id of eliminatedIds) {
          const p = state.players.find((pl) => pl.id === id)
          if (p) {
            io.to(roomId).emit(SocketEvents.PLAYER_ELIMINATED, {
              playerId: p.id,
              playerName: p.name,
            })
          }
        }

        // Check match end
        const winnerId = checkMatchEnd(state)
        if (winnerId) {
          const winner = state.players.find((p) => p.id === winnerId)
          state.phase = GamePhase.End
          io.to(roomId).emit(SocketEvents.MATCH_END, {
            winnerId,
            winnerName: winner?.name ?? 'Unknown',
          })
        }

        broadcastStateUpdate(io, roomId, state)
      } catch (error) {
        if (isGameError(error)) {
          socket.emit(SocketEvents.ERROR, {
            code: error.code,
            message: error.message,
          })
        } else {
          console.error('[interrupt] unexpected error:', error)
          socket.emit(SocketEvents.ERROR, {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          })
        }
      }
    }
  )
}
