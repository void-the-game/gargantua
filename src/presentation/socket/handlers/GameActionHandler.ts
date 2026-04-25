import { Server, Socket } from 'socket.io'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import {
  SocketEvents,
  CardPlayPayload,
  TurnPassPayload,
} from '@/shared/types/socket-events'
import { GamePhase } from '@/shared/types/game-types'
import {
  noActiveMatch,
  notYourTurn,
  cardNotInHand,
  mustPlayCardFirst,
  isGameError,
} from '@/shared/errors/GameError'
import { applyCardEffect, isStealCard, executeSteal } from '@/application/game/EffectEngine'
import {
  advanceTurn,
  getCurrentPlayer,
  checkElimination,
  checkMatchEnd,
  tryPlayerReturn,
  drawCards,
} from '@/application/game/TurnManager'
import { broadcastStateUpdate, emitInterruptAvailable } from './StateHandler'
import { CardType } from '@/shared/types/card-types'

const INTERRUPT_TIMEOUT_MS = 10_000

export function registerGameActionHandlers(io: Server, socket: Socket): void {
  // ─── card:play ───────────────────────────────────────────────
  socket.on(
    SocketEvents.CARD_PLAY,
    (payload: CardPlayPayload) => {
      try {
        const { roomId, cardId, targetPlayerId, recycleCardIds, essenceCardId } = payload
        const room = roomStore.getRoomById(roomId)

        if (!room || !room.gameState) {
          throw noActiveMatch()
        }

        const state = room.gameState
        const currentPlayer = getCurrentPlayer(state)

        // Validate turn
        if (currentPlayer.socketId !== socket.id && currentPlayer.id !== socket.id) {
          throw notYourTurn()
        }

        // Find the card in hand
        const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId)
        if (cardIndex === -1) {
          throw cardNotInHand()
        }

        // Remove card from hand and add to discard pile
        const [card] = currentPlayer.hand.splice(cardIndex, 1)
        state.discardPile.push(card)
        state.hasPlayedCardThisTurn = true

        // Apply card effect
        const result = applyCardEffect(card, state, {
          targetPlayerId,
          recycleCardIds,
          essenceCardId,
        })

        // Broadcast the played card (public info)
        io.to(roomId).emit(SocketEvents.CARD_PLAYED, {
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          card: {
            type: card.type,
            color: card.color,
          },
          effectDescription: result.description,
        })

        // Handle steal interrupts
        if (result.requiresInterrupt && result.interruptTargetId) {
          // Set pending interrupt
          state.pendingInterrupt = {
            type: result.interruptType ?? 'steal',
            attackerId: currentPlayer.id,
            targetId: result.interruptTargetId,
            cardId: card.id,
            timeoutMs: INTERRUPT_TIMEOUT_MS,
          }
          state.phase = GamePhase.React

          // Emit interrupt available to the target
          emitInterruptAvailable(io, roomId, state)

          // Set timeout for auto-resolve
          state.pendingInterrupt.timeoutHandle = setTimeout(() => {
            resolveInterruptTimeout(io, roomId, state)
          }, INTERRUPT_TIMEOUT_MS)
        } else {
          // Check for eliminations
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
        }

        // Broadcast updated state
        broadcastStateUpdate(io, roomId, state)
      } catch (error) {
        emitError(socket, error)
      }
    }
  )

  // ─── turn:pass ───────────────────────────────────────────────
  socket.on(
    SocketEvents.TURN_PASS,
    (payload: TurnPassPayload) => {
      try {
        const { roomId } = payload
        const room = roomStore.getRoomById(roomId)

        if (!room || !room.gameState) {
          throw noActiveMatch()
        }

        const state = room.gameState
        const currentPlayer = getCurrentPlayer(state)

        // Validate turn
        if (currentPlayer.socketId !== socket.id && currentPlayer.id !== socket.id) {
          throw notYourTurn()
        }

        // Must have played a card this turn
        if (!state.hasPlayedCardThisTurn) {
          throw mustPlayCardFirst()
        }

        // Advance to next turn
        advanceTurn(state)

        // Handle the new current player
        const nextPlayer = getCurrentPlayer(state)

        // Check if next player is eliminated and can return
        if (nextPlayer.isEliminated) {
          const returned = tryPlayerReturn(state, nextPlayer)
          if (returned) {
            io.to(roomId).emit(SocketEvents.PLAYER_RETURNED, {
              playerId: nextPlayer.id,
              playerName: nextPlayer.name,
              cardsDrawn: nextPlayer.hand.length,
            })
          } else {
            // Player cannot return — advance again
            advanceTurn(state)
          }
        }

        // Start-of-turn mandatory draw (1 card) if not blocked
        const activePlayer = getCurrentPlayer(state)
        if (!activePlayer.isEliminated) {
          if (state.blockPurchaseFlag) {
            state.blockPurchaseFlag = false
          } else {
            drawCards(state, activePlayer, 1)
          }
        }

        // Check match end after turn advance
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
        emitError(socket, error)
      }
    }
  )
}

function resolveInterruptTimeout(
  io: Server,
  roomId: string,
  state: GameState
): void {
  if (!state.pendingInterrupt) return

  const { attackerId, targetId } = state.pendingInterrupt

  // Apply the original steal effect
  executeSteal(state, attackerId, targetId, 1)

  // Clear interrupt state
  state.pendingInterrupt = null
  state.phase = GamePhase.Play

  // Check eliminations after steal
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
}

function emitError(socket: Socket, error: unknown): void {
  if (isGameError(error)) {
    socket.emit(SocketEvents.ERROR, {
      code: error.code,
      message: error.message,
    })
  } else {
    console.error('[game] unexpected error:', error)
    socket.emit(SocketEvents.ERROR, {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    })
  }
}
