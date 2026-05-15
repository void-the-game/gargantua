import { Server, Socket } from 'socket.io'
import { roomStore } from '@/infrastructure/stores/InMemoryRoomStore'
import {
  SocketEvents,
  CardPlayPayload,
  TurnPassPayload,
  DiscardSubmitPayload,
} from '@/shared/types/socket-events'
import { GamePhase, GameState, PendingDiscard } from '@/shared/types/game-types'
import {
  noActiveMatch,
  notYourTurn,
  cardNotInHand,
  mustPlayCardFirst,
  alreadyPlayedCard,
  isGameError,
  invalidDiscard,
} from '@/shared/errors/GameError'
import { applyCardEffect, isStealCard, executeSteal } from '@/application/game/EffectEngine'
import {
  advanceTurn,
  getCurrentPlayer,
  getNextPlayer,
  getPreviousPlayer,
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

        // Only 1 card per turn
        if (state.hasPlayedCardThisTurn) {
          throw alreadyPlayedCard()
        }

        // Block if waiting for discard
        if (state.pendingDiscard) {
          throw new Error('Aguardando descartes dos oponentes.')
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

        const requiresDelay = [
          CardType.StealNextOne, CardType.StealPrevOne, CardType.StealAnyOne,
          CardType.StealNextTwo, CardType.StealPrevTwo,
          CardType.SwapNextHand, CardType.SwapPrevHand, CardType.SwapAnyHand,
          CardType.BlockPurchase, CardType.Vortex, CardType.BlackHole
        ].includes(card.type)

        if (requiresDelay) {
          let interruptTargetId = undefined
          if (card.type === CardType.StealNextOne || card.type === CardType.StealNextTwo) interruptTargetId = getNextPlayer(state).id
          else if (card.type === CardType.StealPrevOne || card.type === CardType.StealPrevTwo) interruptTargetId = getPreviousPlayer(state).id
          else if (card.type === CardType.StealAnyOne) interruptTargetId = targetPlayerId

          state.pendingInterrupt = {
            type: 'card_played',
            attackerId: currentPlayer.id,
            targetId: interruptTargetId,
            cardId: card.id,
            context: { targetPlayerId, recycleCardIds, essenceCardId },
            timeoutMs: INTERRUPT_TIMEOUT_MS,
            nullifiedPlayerIds: [],
          }
          state.phase = GamePhase.React
          emitInterruptAvailable(io, roomId, state)

          state.pendingInterrupt.timeoutHandle = setTimeout(() => {
            resolveInterruptTimeout(io, roomId, state)
          }, INTERRUPT_TIMEOUT_MS)

          io.to(roomId).emit(SocketEvents.CARD_PLAYED, {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            card: { type: card.type, color: card.color },
            effectDescription: `Aguardando reações...`,
          })
        } else {
          // Apply card effect immediately
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

          if (result.requiresDiscard && state.pendingDiscard) {
            state.phase = GamePhase.Resolve
            const pd = state.pendingDiscard as unknown as PendingDiscard // TS narrowing bypass

            for (const targetId of pd.remainingTargetIds) {
              const targetSocket = state.players.find(p => p.id === targetId)?.socketId
              if (targetSocket) {
                io.to(targetSocket).emit(SocketEvents.DISCARD_REQUIRED, {
                  reason: pd.reason,
                  requiredColor: pd.requiredColor
                })
              }
            }

            // Auto-resolve after timeout: apply penalty to players who didn't respond
            pd.timeoutHandle = setTimeout(() => {
              resolveDiscardTimeout(io, roomId, state)
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

        // Block if waiting for discard
        if (state.pendingDiscard) {
          throw new Error('Aguardando descartes dos oponentes.')
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

  // ─── interrupt:play ──────────────────────────────────────────
  socket.on(
    SocketEvents.INTERRUPT_PLAY,
    (payload: InterruptPlayPayload) => {
      try {
        const { roomId, cardId } = payload
        const room = roomStore.getRoomById(roomId)

        if (!room || !room.gameState) throw noActiveMatch()
        const state = room.gameState

        if (!state.pendingInterrupt) throw new Error('Nenhuma interrupção pendente.')

        const playerIndex = state.players.findIndex(p => p.socketId === socket.id || p.id === socket.id)
        if (playerIndex === -1) throw new Error('Jogador não encontrado.')
        const player = state.players[playerIndex]

        // Check if player has the card
        const cardIndex = player.hand.findIndex(c => c.id === cardId)
        if (cardIndex === -1) throw cardNotInHand()
        const card = player.hand[cardIndex]

        // Only allow reaction cards
        if (![CardType.BlockSteal, CardType.Reflect, CardType.Nullify].includes(card.type)) {
          throw new Error('Apenas cartas de reação podem ser jogadas agora.')
        }

        // Remove card from hand and add to discard pile
        player.hand.splice(cardIndex, 1)
        state.discardPile.push(card)

        const pi = state.pendingInterrupt

        // Check if attack is multi-target (AoE)
        const attackCard = state.discardPile.find(c => c.id === pi.cardId)
        const isMultiTarget = attackCard && (attackCard.type === CardType.Vortex || attackCard.type === CardType.BlackHole)

        // Broadcast the reaction
        io.to(roomId).emit(SocketEvents.CARD_PLAYED, {
          playerId: player.id,
          playerName: player.name,
          card: { type: card.type, color: card.color },
          effectDescription: `Reagiu com ${card.type}`,
        })

        if (isMultiTarget) {
          // Multi-target: just add to nullified list, don't clear timeout
          pi.nullifiedPlayerIds.push(player.id)
        } else {
          // Single-target: cancel attack completely
          if (pi.timeoutHandle) clearTimeout(pi.timeoutHandle)
          state.pendingInterrupt = null
          state.phase = GamePhase.Play
        }

        broadcastStateUpdate(io, roomId, state)
      } catch (error) {
        emitError(socket, error)
      }
    }
  )

  // ─── discard:submit ──────────────────────────────────────────
  socket.on(
    SocketEvents.DISCARD_SUBMIT,
    (payload: DiscardSubmitPayload) => {
      try {
        const { roomId, cardIds } = payload
        const room = roomStore.getRoomById(roomId)
        if (!room || !room.gameState) throw noActiveMatch()

        const state = room.gameState
        if (!state.pendingDiscard) throw new Error('Nenhum descarte pendente.')

        const pd = state.pendingDiscard

        const playerIndex = state.players.findIndex(p => p.socketId === socket.id || p.id === socket.id)
        if (playerIndex === -1) throw new Error('Jogador não encontrado.')
        const player = state.players[playerIndex]

        if (!pd.remainingTargetIds.includes(player.id)) {
          throw invalidDiscard('Você não precisa descartar cartas agora.')
        }

        // Validate cards exist in hand
        const cardsToDiscard: import('@/shared/types/card-types').Card[] = []
        for (const id of cardIds) {
          const card = player.hand.find(c => c.id === id)
          if (!card) throw cardNotInHand()
          cardsToDiscard.push(card)
        }

        const sourcePlayer = state.players.find(p => p.id === pd.sourcePlayerId)

        if (pd.reason === 'vortex') {
          // Expected 1 card of required color or Joker
          const validCard = cardsToDiscard.length === 1 &&
            (cardsToDiscard[0].color === pd.requiredColor || cardsToDiscard[0].type === CardType.Joker)

          if (validCard) {
            // Discard it
            player.hand = player.hand.filter(c => c.id !== cardsToDiscard[0].id)
            state.discardPile.push(cardsToDiscard[0])
          } else {
            // Penalty: Source player steals 1 random card
            if (player.hand.length > 0 && sourcePlayer) {
              const stealIndex = Math.floor(Math.random() * player.hand.length)
              const [stolen] = player.hand.splice(stealIndex, 1)
              sourcePlayer.hand.push(stolen)
            }
          }
        } else if (pd.reason === 'black_hole') {
          // Expected 1 card of required color or Joker
          const validCard = cardsToDiscard.length === 1 &&
            (cardsToDiscard[0].color === pd.requiredColor || cardsToDiscard[0].type === CardType.Joker)

          if (validCard) {
            // Discard it
            player.hand = player.hand.filter(c => c.id !== cardsToDiscard[0].id)
            state.discardPile.push(cardsToDiscard[0])
          } else {
            // Penalty: Must discard 2 cards of their choice
            const requiredCount = Math.min(2, player.hand.length)
            if (cardsToDiscard.length !== requiredCount) {
              throw invalidDiscard(`Você deve descartar exatamente ${requiredCount} carta(s).`)
            }
            player.hand = player.hand.filter(c => !cardIds.includes(c.id))
            state.discardPile.push(...cardsToDiscard)
          }
        }

        // Remove from pending
        pd.remainingTargetIds = pd.remainingTargetIds.filter(id => id !== player.id)

        // If everyone responded, cancel the timeout and resume
        if (pd.remainingTargetIds.length === 0) {
          if (pd.timeoutHandle) clearTimeout(pd.timeoutHandle)
          state.pendingDiscard = null
          state.phase = GamePhase.Play

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
        }

        broadcastStateUpdate(io, roomId, state)
      } catch (error) {
        emitError(socket, error)
        if (isGameError(error) && error.code === 'INVALID_DISCARD') {
          const room = roomStore.getRoomById(payload.roomId)
          if (room && room.gameState?.pendingDiscard) {
            socket.emit(SocketEvents.DISCARD_REQUIRED, {
              reason: room.gameState.pendingDiscard.reason,
              requiredColor: room.gameState.pendingDiscard.requiredColor
            })
          }
        }
      }
    }
  )
}

function resolveDiscardTimeout(
  io: Server,
  roomId: string,
  state: GameState
): void {
  if (!state.pendingDiscard) return

  const pd = state.pendingDiscard
  const sourcePlayer = state.players.find(p => p.id === pd.sourcePlayerId)

  // Apply penalty to every player who didn't respond in time
  for (const targetId of pd.remainingTargetIds) {
    const target = state.players.find(p => p.id === targetId)
    if (!target || target.hand.length === 0) continue

    if (pd.reason === 'vortex') {
      // Penalty: source player steals 1 random card
      if (sourcePlayer) {
        const idx = Math.floor(Math.random() * target.hand.length)
        const [stolen] = target.hand.splice(idx, 1)
        sourcePlayer.hand.push(stolen)
      }
    } else if (pd.reason === 'black_hole') {
      // Penalty: target discards 2 random cards
      const count = Math.min(2, target.hand.length)
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * target.hand.length)
        const [discarded] = target.hand.splice(idx, 1)
        state.discardPile.push(discarded)
      }
    }
  }

  state.pendingDiscard = null
  state.phase = GamePhase.Play

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

function resolveInterruptTimeout(
  io: Server,
  roomId: string,
  state: GameState
): void {
  if (!state.pendingInterrupt) return

  const { attackerId, cardId, context, nullifiedPlayerIds } = state.pendingInterrupt

  const attacker = state.players.find(p => p.id === attackerId)
  const card = state.discardPile.find(c => c.id === cardId)

  if (attacker && card) {
    const result = applyCardEffect(card, state, context)

    io.to(roomId).emit(SocketEvents.CARD_PLAYED, {
      playerId: attacker.id,
      playerName: attacker.name,
      card: { type: card.type, color: card.color },
      effectDescription: result.description,
    })

    if (result.interruptType === 'steal' && result.interruptTargetId) {
      const stealCount = (card.type === CardType.StealNextTwo || card.type === CardType.StealPrevTwo) ? 2 : 1
      executeSteal(state, attackerId, result.interruptTargetId, stealCount)
    }

    if (result.requiresDiscard && state.pendingDiscard) {
      state.phase = GamePhase.Resolve
      const pd = state.pendingDiscard as unknown as PendingDiscard // TS narrowing bypass

      // Remove players who used Nullify
      pd.remainingTargetIds = pd.remainingTargetIds.filter(id => !nullifiedPlayerIds.includes(id))

      if (pd.remainingTargetIds.length === 0) {
        // Everyone nullified! Resume play.
        state.pendingDiscard = null
        state.phase = GamePhase.Play
      } else {
        for (const targetId of pd.remainingTargetIds) {
          const targetSocket = state.players.find(p => p.id === targetId)?.socketId
          if (targetSocket) {
            io.to(targetSocket).emit(SocketEvents.DISCARD_REQUIRED, {
              reason: pd.reason,
              requiredColor: pd.requiredColor
            })
          }
        }

        pd.timeoutHandle = setTimeout(() => {
          resolveDiscardTimeout(io, roomId, state)
        }, INTERRUPT_TIMEOUT_MS)
      }
    } else {
      state.phase = GamePhase.Play
    }
  } else {
    state.phase = GamePhase.Play
  }

  state.pendingInterrupt = null

  // Check eliminations after effect
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
