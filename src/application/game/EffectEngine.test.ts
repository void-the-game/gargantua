import { applyCardEffect } from './EffectEngine'
import { GameState, GamePhase, TurnDirection, Player } from '@/shared/types/game-types'
import { Card, CardType, CardColor } from '@/shared/types/card-types'

function createCard(id: string, type = CardType.Essence, color = CardColor.Blue): Card {
  return { id, type, color }
}

function createPlayer(id: string, name: string, hand: Card[] = []): Player {
  return {
    id,
    socketId: `socket-${id}`,
    name,
    hand,
    isEliminated: false,
    canReturn: false,
  }
}

function createGameState(players: Player[], opts: Partial<GameState> = {}): GameState {
  return {
    roomId: 'room-1',
    players,
    deck: [
      createCard('d1'), createCard('d2'), createCard('d3'),
      createCard('d4'), createCard('d5'),
    ],
    discardPile: [],
    currentTurnIndex: 0,
    direction: TurnDirection.Clockwise,
    turnNumber: 1,
    phase: GamePhase.Play,
    pendingInterrupt: null,
    pendingDiscard: null,
    blockPurchaseFlag: false,
    purchaseBlockedThisTurn: false,
    hasPlayedCardThisTurn: false,
    ...opts,
  }
}

describe('EffectEngine', () => {
  describe('BuyPlus1 / BuyPlus2', () => {
    it('should draw 1 extra card for the current player when BuyPlus1 is played', () => {
      const p1 = createPlayer('p1', 'Alice')
      const p2 = createPlayer('p2', 'Bob')
      const state = createGameState([p1, p2])
      const card = createCard('c1', CardType.BuyPlus1)
      const deckSizeBefore = state.deck.length

      const result = applyCardEffect(card, state)

      expect(p1.hand).toHaveLength(1)
      expect(p2.hand).toHaveLength(0)
      expect(state.deck).toHaveLength(deckSizeBefore - 1)
      expect(result.description).toContain('Alice')
    })

    it('should draw 2 extra cards for the current player when BuyPlus2 is played', () => {
      const p1 = createPlayer('p1', 'Alice')
      const p2 = createPlayer('p2', 'Bob')
      const state = createGameState([p1, p2])
      const card = createCard('c1', CardType.BuyPlus2)
      const deckSizeBefore = state.deck.length

      const result = applyCardEffect(card, state)

      expect(p1.hand).toHaveLength(2)
      expect(p2.hand).toHaveLength(0)
      expect(state.deck).toHaveLength(deckSizeBefore - 2)
      expect(result.description).toContain('Alice')
    })

    it('should NOT draw cards for next player when purchaseBlockedThisTurn is active (bug fix)', () => {
      const p1 = createPlayer('p1', 'Alice')
      const p2 = createPlayer('p2', 'Bob')
      const state = createGameState([p1, p2], { purchaseBlockedThisTurn: true })
      const card = createCard('c1', CardType.BuyPlus1)
      const deckSizeBefore = state.deck.length

      const result = applyCardEffect(card, state)

      expect(p2.hand).toHaveLength(0)
      expect(state.deck).toHaveLength(deckSizeBefore)
      expect(result.description).toContain('bloqueada')
    })

    it('should NOT touch purchaseBlockedThisTurn when blocking BuyPlus (flag lifecycle owned by advanceTurn)', () => {
      const p1 = createPlayer('p1', 'Alice')
      const p2 = createPlayer('p2', 'Bob')
      const state = createGameState([p1, p2], { purchaseBlockedThisTurn: true })
      const card = createCard('c1', CardType.BuyPlus1)

      applyCardEffect(card, state)

      expect(state.purchaseBlockedThisTurn).toBe(true)
    })
  })
})
