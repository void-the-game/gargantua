import {
  advanceTurn,
  getCurrentPlayer,
  getNextPlayer,
  getPreviousPlayer,
  getPlayerById,
  getActiveOpponents,
  getActivePlayers,
  checkElimination,
  tryPlayerReturn,
  checkMatchEnd,
  drawCards,
} from './TurnManager'
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
    blockPurchaseTurnsRemaining: 0,
    purchaseBlockedThisTurn: false,
    hasPlayedCardThisTurn: false,
    ...opts,
  }
}

describe('TurnManager', () => {
  describe('advanceTurn', () => {
    it('should advance to next player clockwise', () => {
      const players = [createPlayer('p1', 'A'), createPlayer('p2', 'B'), createPlayer('p3', 'C')]
      const state = createGameState(players)

      advanceTurn(state)

      expect(state.currentTurnIndex).toBe(1)
      expect(state.turnNumber).toBe(2)
      expect(state.hasPlayedCardThisTurn).toBe(false)
    })

    it('should wrap around at the end', () => {
      const players = [createPlayer('p1', 'A'), createPlayer('p2', 'B')]
      const state = createGameState(players, { currentTurnIndex: 1 })

      advanceTurn(state)

      expect(state.currentTurnIndex).toBe(0)
    })

    it('should respect counter-clockwise direction', () => {
      const players = [createPlayer('p1', 'A'), createPlayer('p2', 'B'), createPlayer('p3', 'C')]
      const state = createGameState(players, { direction: TurnDirection.CounterClockwise })

      advanceTurn(state)

      expect(state.currentTurnIndex).toBe(2)
    })

    it('should skip eliminated players', () => {
      const p1 = createPlayer('p1', 'A')
      const p2 = createPlayer('p2', 'B')
      p2.isEliminated = true
      const p3 = createPlayer('p3', 'C')
      const state = createGameState([p1, p2, p3])

      advanceTurn(state)

      expect(state.currentTurnIndex).toBe(2) // skipped p2
    })

    it('should draw exactly 1 card at the start of a normal turn', () => {
      const p1 = createPlayer('p1', 'A')
      const p2 = createPlayer('p2', 'B')
      const state = createGameState([p1, p2])
      const deckSizeBefore = state.deck.length

      advanceTurn(state)

      expect(p2.hand).toHaveLength(1)
      expect(state.deck).toHaveLength(deckSizeBefore - 1)
    })

    it('should skip auto-draw when blockPurchaseFlag is active', () => {
      const p1 = createPlayer('p1', 'A')
      const p2 = createPlayer('p2', 'B')
      const state = createGameState([p1, p2], { blockPurchaseTurnsRemaining: 1 })
      const deckSizeBefore = state.deck.length

      advanceTurn(state)

      expect(p2.hand).toHaveLength(0)
      expect(state.deck).toHaveLength(deckSizeBefore)
    })

    it('should keep purchaseBlockedThisTurn=true during the blocked turn so BuyPlus is also blocked', () => {
      const p1 = createPlayer('p1', 'A')
      const p2 = createPlayer('p2', 'B')
      const state = createGameState([p1, p2], { blockPurchaseTurnsRemaining: 1 })

      advanceTurn(state)

      expect(state.purchaseBlockedThisTurn).toBe(true)
      expect(state.blockPurchaseTurnsRemaining).toBe(0)
    })

    it('should clear purchaseBlockedThisTurn at the start of the NEXT advanceTurn', () => {
      const p1 = createPlayer('p1', 'A')
      const p2 = createPlayer('p2', 'B')
      const state = createGameState([p1, p2], { blockPurchaseTurnsRemaining: 1 })

      advanceTurn(state) // p2's blocked turn — purchaseBlockedThisTurn=true
      advanceTurn(state) // p1's next turn — purchaseBlockedThisTurn cleared, draw happens

      expect(state.purchaseBlockedThisTurn).toBe(false)
      expect(state.blockPurchaseTurnsRemaining).toBe(0)
      expect(p1.hand).toHaveLength(1) // normal draw on p1's turn
    })
  })

  describe('getCurrentPlayer', () => {
    it('should return the current player', () => {
      const players = [createPlayer('p1', 'Alice'), createPlayer('p2', 'Bob')]
      const state = createGameState(players)

      expect(getCurrentPlayer(state).name).toBe('Alice')
    })
  })

  describe('getNextPlayer', () => {
    it('should return next active player clockwise', () => {
      const players = [createPlayer('p1', 'A'), createPlayer('p2', 'B'), createPlayer('p3', 'C')]
      const state = createGameState(players)

      expect(getNextPlayer(state).id).toBe('p2')
    })

    it('should skip eliminated players', () => {
      const p1 = createPlayer('p1', 'A')
      const p2 = createPlayer('p2', 'B')
      p2.isEliminated = true
      const p3 = createPlayer('p3', 'C')
      const state = createGameState([p1, p2, p3])

      expect(getNextPlayer(state).id).toBe('p3')
    })
  })

  describe('getPreviousPlayer', () => {
    it('should return previous active player', () => {
      const players = [createPlayer('p1', 'A'), createPlayer('p2', 'B'), createPlayer('p3', 'C')]
      const state = createGameState(players)

      expect(getPreviousPlayer(state).id).toBe('p3') // wraps around
    })
  })

  describe('getPlayerById', () => {
    it('should find player by ID', () => {
      const players = [createPlayer('p1', 'Alice')]
      const state = createGameState(players)

      expect(getPlayerById(state, 'p1')?.name).toBe('Alice')
    })

    it('should return undefined for unknown ID', () => {
      const state = createGameState([createPlayer('p1', 'A')])
      expect(getPlayerById(state, 'unknown')).toBeUndefined()
    })
  })

  describe('getActiveOpponents', () => {
    it('should exclude current player and eliminated players', () => {
      const p1 = createPlayer('p1', 'A')
      const p2 = createPlayer('p2', 'B')
      const p3 = createPlayer('p3', 'C')
      p3.isEliminated = true
      const state = createGameState([p1, p2, p3])

      const opponents = getActiveOpponents(state)
      expect(opponents).toHaveLength(1)
      expect(opponents[0].id).toBe('p2')
    })
  })

  describe('checkElimination', () => {
    it('should mark players with empty hands as eliminated', () => {
      const p1 = createPlayer('p1', 'A', [createCard('c1')])
      const p2 = createPlayer('p2', 'B', []) // empty hand
      const state = createGameState([p1, p2])

      const eliminated = checkElimination(state)

      expect(eliminated).toEqual(['p2'])
      expect(p2.isEliminated).toBe(true)
      expect(p2.canReturn).toBe(true)
    })

    it('should not re-eliminate already eliminated players', () => {
      const p1 = createPlayer('p1', 'A', [createCard('c1')])
      const p2 = createPlayer('p2', 'B', [])
      p2.isEliminated = true
      const state = createGameState([p1, p2])

      const eliminated = checkElimination(state)
      expect(eliminated).toHaveLength(0)
    })
  })

  describe('tryPlayerReturn', () => {
    it('should return player with 3 cards from deck', () => {
      const p = createPlayer('p1', 'A')
      p.isEliminated = true
      p.canReturn = true
      const state = createGameState([p])

      const returned = tryPlayerReturn(state, p)

      expect(returned).toBe(true)
      expect(p.isEliminated).toBe(false)
      expect(p.canReturn).toBe(false)
      expect(p.hand).toHaveLength(2) // I updated tryPlayerReturn to draw 2 cards
      expect(state.deck).toHaveLength(3) // 5 - 2
    })

    it('should not return player if canReturn is false', () => {
      const p = createPlayer('p1', 'A')
      p.isEliminated = true
      p.canReturn = false
      const state = createGameState([p])

      expect(tryPlayerReturn(state, p)).toBe(false)
      expect(p.isEliminated).toBe(true)
    })

    it('should not return player if deck is empty', () => {
      const p = createPlayer('p1', 'A')
      p.isEliminated = true
      p.canReturn = true
      const state = createGameState([p], { deck: [] })

      expect(tryPlayerReturn(state, p)).toBe(false)
    })
  })

  describe('checkMatchEnd', () => {
    it('should return winner when only 1 active player', () => {
      const p1 = createPlayer('p1', 'A', [createCard('c1')])
      const p2 = createPlayer('p2', 'B')
      p2.isEliminated = true
      const state = createGameState([p1, p2])

      expect(checkMatchEnd(state)).toBe('p1')
    })

    it('should return null when multiple active players', () => {
      const p1 = createPlayer('p1', 'A', [createCard('c1')])
      const p2 = createPlayer('p2', 'B', [createCard('c2')])
      const state = createGameState([p1, p2])

      expect(checkMatchEnd(state)).toBeNull()
    })
  })

  describe('drawCards', () => {
    it('should draw cards from deck to player hand', () => {
      const p = createPlayer('p1', 'A', [createCard('c1')])
      const state = createGameState([p])

      const drawn = drawCards(state, p, 2)

      expect(drawn).toBe(2)
      expect(p.hand).toHaveLength(3) // 1 original + 2 drawn
      expect(state.deck).toHaveLength(3) // 5 - 2
    })

    it('should draw only available cards if deck is small', () => {
      const p = createPlayer('p1', 'A')
      const state = createGameState([p], { deck: [createCard('d1')] })

      const drawn = drawCards(state, p, 5)

      expect(drawn).toBe(1)
      expect(p.hand).toHaveLength(1)
      expect(state.deck).toHaveLength(0)
    })
  })
})
