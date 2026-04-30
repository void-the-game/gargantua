import { Card, CardType, CardColor, STEAL_CARDS } from '@/shared/types/card-types'
import { GameState, Player, TurnDirection } from '@/shared/types/game-types'
import {
  getCurrentPlayer,
  getNextPlayer,
  getPreviousPlayer,
  getPlayerById,
  getActiveOpponents,
  drawCards,
} from './TurnManager'

export interface EffectResult {
  description: string
  requiresInterrupt: boolean
  interruptTargetId?: string
  interruptType?: 'steal' | 'card_played'
}

/**
 * Apply the effect of a played card on the game state.
 * Returns a description of the effect for broadcasting.
 */
export function applyCardEffect(
  card: Card,
  state: GameState,
  context?: {
    targetPlayerId?: string
    recycleCardIds?: string[]
    essenceCardId?: string
  }
): EffectResult {
  switch (card.type) {
    case CardType.Essence:
      return handleEssence()

    case CardType.Joker:
      return handleJoker()

    case CardType.BlackHole:
      return handleBlackHole(card, state)

    case CardType.Vortex:
      return handleVortex(card, state)

    case CardType.BuyPlus1:
      return handleBuyPlus(state, 1)

    case CardType.BuyPlus2:
      return handleBuyPlus(state, 2)

    case CardType.StealNextOne:
      return handleStealNext(state)

    case CardType.StealPrevOne:
      return handleStealPrev(state)

    case CardType.StealAnyOne:
      return handleStealAny(state, context?.targetPlayerId)

    case CardType.Trap:
      return handleTrap()

    case CardType.Recycle:
      return handleRecycle(state, context?.recycleCardIds)

    case CardType.BlockPurchase:
      return handleBlockPurchase(state)

    case CardType.SwapNextHand:
      return handleSwapNext(state)

    case CardType.SwapPrevHand:
      return handleSwapPrev(state)

    case CardType.SwapAnyHand:
      return handleSwapAny(state, context?.targetPlayerId)

    case CardType.ExtraPower:
      return handleExtraPower(card, state, context?.essenceCardId)

    case CardType.BlockSteal:
    case CardType.Reflect:
    case CardType.Nullify:
      // Reactive cards — no effect when played actively
      return { description: 'Played a reactive card (no active effect)', requiresInterrupt: false }

    default:
      return { description: 'Unknown card effect', requiresInterrupt: false }
  }
}

// ─── Effect Handlers ─────────────────────────────────────────────

function handleEssence(): EffectResult {
  return { description: 'Played an Essence card', requiresInterrupt: false }
}

function handleJoker(): EffectResult {
  return { description: 'Played a Joker (wild essence)', requiresInterrupt: false }
}

function handleBlackHole(card: Card, state: GameState): EffectResult {
  const opponents = getActiveOpponents(state)

  for (const opponent of opponents) {
    const colorCards = opponent.hand.filter((c) => c.color === card.color)

    if (colorCards.length > 0) {
      // Discard 1 card of the same color
      const toDiscard = colorCards[0]
      opponent.hand = opponent.hand.filter((c) => c.id !== toDiscard.id)
      state.discardPile.push(toDiscard)
    } else {
      // No cards of that color — discard 2 random cards
      const toDiscard = opponent.hand.splice(0, Math.min(2, opponent.hand.length))
      state.discardPile.push(...toDiscard)
    }
  }

  return {
    description: `Black Hole (${card.color}): opponents discard cards`,
    requiresInterrupt: false,
  }
}

function handleVortex(card: Card, state: GameState): EffectResult {
  const currentPlayer = getCurrentPlayer(state)
  const opponents = getActiveOpponents(state)

  for (const opponent of opponents) {
    const colorCards = opponent.hand.filter((c) => c.color === card.color)

    if (colorCards.length > 0) {
      // Opponent discards 1 of the color
      const toDiscard = colorCards[0]
      opponent.hand = opponent.hand.filter((c) => c.id !== toDiscard.id)
      state.discardPile.push(toDiscard)
    } else {
      // No cards of that color — current player steals 1 from opponent
      if (opponent.hand.length > 0) {
        const stolen = opponent.hand.splice(0, 1)[0]
        currentPlayer.hand.push(stolen)
      }
    }
  }

  return {
    description: `Vortex (${card.color}): opponents lose cards`,
    requiresInterrupt: false,
  }
}

function handleBuyPlus(state: GameState, amount: number): EffectResult {
  const player = getCurrentPlayer(state)
  const drawn = drawCards(state, player, amount)

  return {
    description: `Drew ${drawn} card(s) from the deck`,
    requiresInterrupt: false,
  }
}

function handleStealNext(state: GameState): EffectResult {
  const target = getNextPlayer(state)

  return {
    description: `Steal 1 card from ${target.name}`,
    requiresInterrupt: true,
    interruptTargetId: target.id,
    interruptType: 'steal',
  }
}

function handleStealPrev(state: GameState): EffectResult {
  const target = getPreviousPlayer(state)

  return {
    description: `Steal 1 card from ${target.name}`,
    requiresInterrupt: true,
    interruptTargetId: target.id,
    interruptType: 'steal',
  }
}

function handleStealAny(
  state: GameState,
  targetPlayerId?: string
): EffectResult {
  const target = targetPlayerId
    ? getPlayerById(state, targetPlayerId)
    : getActiveOpponents(state)[0]

  if (!target) {
    return { description: 'No valid target for steal', requiresInterrupt: false }
  }

  return {
    description: `Steal 1 card from ${target.name}`,
    requiresInterrupt: true,
    interruptTargetId: target.id,
    interruptType: 'steal',
  }
}

function handleTrap(): EffectResult {
  // Trap is a passive card — its effect triggers when the holder is stolen from
  return {
    description: 'Set a Trap (activates when stolen from)',
    requiresInterrupt: false,
  }
}

function handleRecycle(
  state: GameState,
  recycleCardIds?: string[]
): EffectResult {
  const player = getCurrentPlayer(state)
  const toRecycle = recycleCardIds ?? []
  const maxRecycle = Math.min(2, toRecycle.length)

  let recycled = 0
  for (let i = 0; i < maxRecycle; i++) {
    const cardIndex = player.hand.findIndex((c) => c.id === toRecycle[i])
    if (cardIndex !== -1) {
      const [card] = player.hand.splice(cardIndex, 1)
      state.discardPile.push(card)
      recycled++
    }
  }

  // Draw the same number of cards
  const drawn = drawCards(state, player, recycled)

  return {
    description: `Recycled ${recycled} card(s), drew ${drawn}`,
    requiresInterrupt: false,
  }
}

function handleBlockPurchase(state: GameState): EffectResult {
  state.blockPurchaseFlag = true

  return {
    description: 'Blocked purchases for the next turn',
    requiresInterrupt: false,
  }
}

function handleSwapNext(state: GameState): EffectResult {
  const player = getCurrentPlayer(state)
  const target = getNextPlayer(state)
  swapHands(player, target)

  return {
    description: `Swapped hand with ${target.name}`,
    requiresInterrupt: false,
  }
}

function handleSwapPrev(state: GameState): EffectResult {
  const player = getCurrentPlayer(state)
  const target = getPreviousPlayer(state)
  swapHands(player, target)

  return {
    description: `Swapped hand with ${target.name}`,
    requiresInterrupt: false,
  }
}

function handleSwapAny(
  state: GameState,
  targetPlayerId?: string
): EffectResult {
  const player = getCurrentPlayer(state)
  const target = targetPlayerId
    ? getPlayerById(state, targetPlayerId)
    : getActiveOpponents(state)[0]

  if (!target) {
    return { description: 'No valid target for swap', requiresInterrupt: false }
  }

  swapHands(player, target)

  return {
    description: `Swapped hand with ${target.name}`,
    requiresInterrupt: false,
  }
}

function handleExtraPower(
  card: Card,
  state: GameState,
  essenceCardId?: string
): EffectResult {
  const player = getCurrentPlayer(state)
  let hasEssenceBonus = false

  // Check if playing with a matching essence card
  if (essenceCardId) {
    const essenceIndex = player.hand.findIndex(
      (c) => c.id === essenceCardId && c.type === CardType.Essence && c.color === card.color
    )
    if (essenceIndex !== -1) {
      const [essence] = player.hand.splice(essenceIndex, 1)
      state.discardPile.push(essence)
      hasEssenceBonus = true
    }
  }

  // Apply base effect based on color
  const description = applyExtraPowerByColor(card.color, state, hasEssenceBonus)

  return {
    description,
    requiresInterrupt: false,
  }
}

function applyExtraPowerByColor(
  color: CardColor,
  state: GameState,
  hasBonus: boolean
): string {
  const player = getCurrentPlayer(state)

  switch (color) {
    case CardColor.Blue: {
      // Blue: draw 2 cards (bonus: draw 4)
      const count = hasBonus ? 4 : 2
      drawCards(state, player, count)
      return `Extra Power (Blue): drew ${count} cards`
    }
    case CardColor.Green: {
      // Green: view 1 opponent's hand (bonus: view all)
      // Note: this is a visibility effect — handled in broadcast
      return hasBonus
        ? 'Extra Power (Green): revealed all opponents\' hands'
        : 'Extra Power (Green): revealed 1 opponent\'s hand'
    }
    case CardColor.Yellow: {
      // Yellow: reverse direction (bonus: reverse + skip next)
      state.direction =
        state.direction === TurnDirection.Clockwise ? TurnDirection.CounterClockwise : TurnDirection.Clockwise
      return hasBonus
        ? 'Extra Power (Yellow): reversed direction and skip next player'
        : 'Extra Power (Yellow): reversed direction'
    }
    case CardColor.Purple: {
      // Purple: opponents draw 1 (bonus: opponents draw 2)
      const count = hasBonus ? 2 : 1
      const opponents = getActiveOpponents(state)
      for (const opponent of opponents) {
        drawCards(state, opponent, count)
      }
      return `Extra Power (Purple): opponents drew ${count} card(s) each`
    }
    default:
      return 'Extra Power: no effect'
  }
}

/**
 * Apply the actual steal effect (called after interrupt resolution).
 */
export function executeSteal(
  state: GameState,
  attackerId: string,
  targetId: string,
  count = 1
): void {
  const attacker = getPlayerById(state, attackerId)
  const target = getPlayerById(state, targetId)

  if (!attacker || !target || target.hand.length === 0) return

  // Check for Trap in target's hand
  const trapIndex = target.hand.findIndex((c) => c.type === CardType.Trap)
  if (trapIndex !== -1) {
    // Trap activates: the trap card + 1 more card are discarded from the attacker
    const [trap] = target.hand.splice(trapIndex, 1)
    state.discardPile.push(trap)

    if (attacker.hand.length > 0) {
      const [discarded] = attacker.hand.splice(0, 1)
      state.discardPile.push(discarded)
    }
    return
  }

  const stealCount = Math.min(count, target.hand.length)
  const stolen = target.hand.splice(0, stealCount)
  attacker.hand.push(...stolen)
}

/**
 * Reflect a steal: reverse the steal direction.
 */
export function executeReflect(
  state: GameState,
  attackerId: string,
  targetId: string,
  count = 1
): void {
  // The defender steals from the attacker instead
  executeSteal(state, targetId, attackerId, count)
}

// ─── Helpers ─────────────────────────────────────────────────────

function swapHands(a: Player, b: Player): void {
  const temp = a.hand
  a.hand = b.hand
  b.hand = temp
}

/**
 * Check if a card triggers a steal that can be interrupted.
 */
export function isStealCard(type: CardType): boolean {
  return STEAL_CARDS.includes(type)
}
