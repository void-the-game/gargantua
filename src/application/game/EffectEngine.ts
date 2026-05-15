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
  requiresDiscard?: boolean
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
      return handleStealNext(state, 1)

    case CardType.StealPrevOne:
      return handleStealPrev(state, 1)

    case CardType.StealNextTwo:
      return handleStealNext(state, 2)

    case CardType.StealPrevTwo:
      return handleStealPrev(state, 2)

    case CardType.StealAnyOne:
      return handleStealAny(state, 1, context?.targetPlayerId)

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
  const opponents = getActiveOpponents(state).filter(o => o.hand.length > 0)
  const currentPlayer = getCurrentPlayer(state)

  if (opponents.length > 0) {
    state.pendingDiscard = {
      reason: 'black_hole',
      sourcePlayerId: currentPlayer.id,
      requiredColor: card.color,
      remainingTargetIds: opponents.map(o => o.id),
    }
    return {
      description: `Black Hole (${card.color}): opponents must choose cards to discard`,
      requiresInterrupt: false,
      requiresDiscard: true,
    }
  }

  return {
    description: `Black Hole (${card.color}): no opponents have cards`,
    requiresInterrupt: false,
  }
}

function handleVortex(card: Card, state: GameState): EffectResult {
  const opponents = getActiveOpponents(state).filter(o => o.hand.length > 0)
  const currentPlayer = getCurrentPlayer(state)

  if (opponents.length > 0) {
    state.pendingDiscard = {
      reason: 'vortex',
      sourcePlayerId: currentPlayer.id,
      requiredColor: card.color,
      remainingTargetIds: opponents.map(o => o.id),
    }
    return {
      description: `Vortex (${card.color}): opponents must choose cards to discard or be stolen from`,
      requiresInterrupt: false,
      requiresDiscard: true,
    }
  }

  return {
    description: `Vortex (${card.color}): no opponents have cards`,
    requiresInterrupt: false,
  }
}

function handleBuyPlus(state: GameState, amount: number): EffectResult {
  const player = getCurrentPlayer(state)

  if (state.purchaseBlockedThisTurn) {
    return {
      description: `Compra de +${amount} foi bloqueada!`,
      requiresInterrupt: false,
    }
  }

  const drawn = drawCards(state, player, amount)

  return {
    description: `${player.name} comprou ${drawn} carta(s) extra(s)!`,
    requiresInterrupt: false,
  }
}

function handleStealNext(state: GameState, count: number): EffectResult {
  const target = getNextPlayer(state)

  return {
    description: `Steal ${count} card(s) from ${target.name}`,
    requiresInterrupt: true,
    interruptTargetId: target.id,
    interruptType: 'steal',
  }
}

function handleStealPrev(state: GameState, count: number): EffectResult {
  const target = getPreviousPlayer(state)

  return {
    description: `Steal ${count} card(s) from ${target.name}`,
    requiresInterrupt: true,
    interruptTargetId: target.id,
    interruptType: 'steal',
  }
}

function handleStealAny(
  state: GameState,
  count: number,
  targetPlayerId?: string
): EffectResult {
  const target = targetPlayerId
    ? getPlayerById(state, targetPlayerId)
    : getActiveOpponents(state)[0]

  if (!target) {
    return { description: 'No valid target for steal', requiresInterrupt: false }
  }

  return {
    description: `Steal ${count} card(s) from ${target.name}`,
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
  // Max 1 extra card can be recycled (total 2 including the Recycle card itself)
  const maxRecycle = Math.min(1, toRecycle.length)

  let recycled = 0
  for (let i = 0; i < maxRecycle; i++) {
    const cardIndex = player.hand.findIndex((c) => c.id === toRecycle[i])
    if (cardIndex !== -1) {
      const [card] = player.hand.splice(cardIndex, 1)
      state.discardPile.push(card)
      recycled++
    }
  }

  // Draw 1 for the Recycle card itself + 1 for each extra discarded card
  const drawn = drawCards(state, player, recycled + 1)

  return {
    description: `Recycled ${recycled + 1} card(s), drew ${drawn}`,
    requiresInterrupt: false,
  }
}

function handleBlockPurchase(state: GameState): EffectResult {
  const activePlayers = state.players.filter(p => !p.isEliminated).length
  state.blockPurchaseTurnsRemaining = Math.max(0, activePlayers - 1)

  return {
    description: `Blocked purchases for the next ${state.blockPurchaseTurnsRemaining} turn(s)`,
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

  // Check if playing with a matching essence card or Joker
  if (essenceCardId) {
    const essenceIndex = player.hand.findIndex(
      (c) => c.id === essenceCardId &&
        (c.type === CardType.Joker || (c.type === CardType.Essence && c.color === card.color))
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
      // The Extra Power card (and Essence) were just pushed to the discard pile.
      // We must temporarily remove them so they aren't recovered.
      const playedCardsCount = hasBonus ? 2 : 1
      const temporarilyRemoved = state.discardPile.splice(state.discardPile.length - playedCardsCount, playedCardsCount)

      // Green: draw the last card from discard pile (bonus: last 3)
      const count = hasBonus ? 3 : 1
      let drawn = 0
      for (let i = 0; i < count; i++) {
        if (state.discardPile.length > 0) {
          player.hand.push(state.discardPile.pop()!)
          drawn++
        }
      }

      // Put the played cards back into the discard pile
      state.discardPile.push(...temporarilyRemoved)

      return `Extra Power (Green): recovered ${drawn} card(s) from discard pile`
    }
    case CardColor.Yellow: {
      // Yellow: steal 1 random card (bonus: steal 3)
      const count = hasBonus ? 3 : 1
      let stolen = 0
      for (let i = 0; i < count; i++) {
        const opponentsWithCards = getActiveOpponents(state).filter(o => o.hand.length > 0)
        if (opponentsWithCards.length === 0) break
        const opp = opponentsWithCards[Math.floor(Math.random() * opponentsWithCards.length)]
        const cardIndex = Math.floor(Math.random() * opp.hand.length)
        const [card] = opp.hand.splice(cardIndex, 1)
        player.hand.push(card)
        stolen++
      }
      return `Extra Power (Yellow): stole ${stolen} random card(s) from opponents`
    }
    case CardColor.Purple: {
      // Purple: opponents discard 1 random card (bonus: discard 3)
      const count = hasBonus ? 3 : 1
      const opponents = getActiveOpponents(state)
      for (const opponent of opponents) {
        for (let i = 0; i < count; i++) {
          if (opponent.hand.length > 0) {
            const cardIndex = Math.floor(Math.random() * opponent.hand.length)
            const [discarded] = opponent.hand.splice(cardIndex, 1)
            state.discardPile.push(discarded)
          }
        }
      }
      return `Extra Power (Purple): opponents discarded ${count} card(s) each`
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

  const stealCount = Math.min(count, target.hand.length)
  
  for (let i = 0; i < stealCount; i++) {
    if (target.hand.length === 0) break

    // Steal a random card
    const cardIndex = Math.floor(Math.random() * target.hand.length)
    const [stolenCard] = target.hand.splice(cardIndex, 1)

    if (stolenCard.type === CardType.Trap) {
      // Trap activates: the trap card + 1 more card are discarded from the attacker
      state.discardPile.push(stolenCard)
      
      // Attacker loses a card
      if (attacker.hand.length > 0) {
        const attackerDiscardIndex = Math.floor(Math.random() * attacker.hand.length)
        const [discarded] = attacker.hand.splice(attackerDiscardIndex, 1)
        state.discardPile.push(discarded)
      }
    } else {
      attacker.hand.push(stolenCard)
    }
  }
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
