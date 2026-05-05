import { buildDeck, shuffleDeck, dealCards, pickStartingPlayer } from './DeckBuilder'
import { CardType, CardColor } from '@/shared/types/card-types'
import { Player, TurnDirection } from '@/shared/types/game-types'

describe('DeckBuilder', () => {
  describe('buildDeck', () => {
    it('should create a deck with the correct number of cards', () => {
      const deck = buildDeck()
      // Sum of all quantities in DECK_DISTRIBUTION is 86
      expect(deck.length).toBe(86)
    })

    it('should have unique IDs for every card', () => {
      const deck = buildDeck()
      const ids = new Set(deck.map((c) => c.id))
      expect(ids.size).toBe(deck.length)
    })

    it('should contain all card types', () => {
      const deck = buildDeck()
      const types = new Set(deck.map((c) => c.type))

      expect(types.has(CardType.Essence)).toBe(true)
      expect(types.has(CardType.Joker)).toBe(true)
      expect(types.has(CardType.BlackHole)).toBe(true)
      expect(types.has(CardType.Vortex)).toBe(true)
      expect(types.has(CardType.BuyPlus1)).toBe(true)
      expect(types.has(CardType.BuyPlus2)).toBe(true)
      expect(types.has(CardType.StealNextOne)).toBe(true)
      expect(types.has(CardType.StealPrevOne)).toBe(true)
      expect(types.has(CardType.StealNextTwo)).toBe(true)
      expect(types.has(CardType.StealPrevTwo)).toBe(true)
      expect(types.has(CardType.StealAnyOne)).toBe(true)
      expect(types.has(CardType.Trap)).toBe(true)
      expect(types.has(CardType.Recycle)).toBe(true)
      expect(types.has(CardType.BlockPurchase)).toBe(true)
      expect(types.has(CardType.SwapNextHand)).toBe(true)
      expect(types.has(CardType.SwapPrevHand)).toBe(true)
      expect(types.has(CardType.SwapAnyHand)).toBe(true)
      expect(types.has(CardType.ExtraPower)).toBe(true)
      expect(types.has(CardType.BlockSteal)).toBe(true)
      expect(types.has(CardType.Reflect)).toBe(true)
      expect(types.has(CardType.Nullify)).toBe(true)
    })

    it('should have 16 Essence cards (4 per color, excluding White)', () => {
      const deck = buildDeck()
      const essences = deck.filter((c) => c.type === CardType.Essence)
      expect(essences).toHaveLength(16)

      const baseColors = [CardColor.Blue, CardColor.Green, CardColor.Yellow, CardColor.Purple]
      for (const color of baseColors) {
        const ofColor = essences.filter((c) => c.color === color)
        expect(ofColor).toHaveLength(4)
      }
    })

    it('should have 4 Joker cards', () => {
      const deck = buildDeck()
      const jokers = deck.filter((c) => c.type === CardType.Joker)
      expect(jokers).toHaveLength(4)
    })
  })

  describe('shuffleDeck', () => {
    it('should return a deck of the same length', () => {
      const deck = buildDeck()
      const shuffled = shuffleDeck(deck)
      expect(shuffled).toHaveLength(deck.length)
    })

    it('should not mutate the original deck', () => {
      const deck = buildDeck()
      const originalFirst = deck[0].id
      shuffleDeck(deck)
      expect(deck[0].id).toBe(originalFirst)
    })

    it('should produce a different order (probabilistic)', () => {
      const deck = buildDeck()
      const shuffled = shuffleDeck(deck)

      // Check that at least some cards moved position
      let differentPositions = 0
      for (let i = 0; i < deck.length; i++) {
        if (deck[i].id !== shuffled[i].id) differentPositions++
      }

      // With 86 cards, chance of identical order is astronomically low
      expect(differentPositions).toBeGreaterThan(deck.length * 0.5)
    })

    it('should contain the same cards', () => {
      const deck = buildDeck()
      const shuffled = shuffleDeck(deck)

      const originalIds = new Set(deck.map((c) => c.id))
      const shuffledIds = new Set(shuffled.map((c) => c.id))

      expect(shuffledIds).toEqual(originalIds)
    })
  })

  describe('dealCards', () => {
    it('should deal 7 cards to each player', () => {
      const deck = shuffleDeck(buildDeck())
      const players: Player[] = [
        createPlayer('p1', 'Alice'),
        createPlayer('p2', 'Bob'),
      ]

      const deckSizeBefore = deck.length
      dealCards(players, deck)

      expect(players[0].hand).toHaveLength(7)
      expect(players[1].hand).toHaveLength(7)
      expect(deck).toHaveLength(deckSizeBefore - 14)
    })

    it('should deal unique cards to each player', () => {
      const deck = shuffleDeck(buildDeck())
      const players: Player[] = [
        createPlayer('p1', 'Alice'),
        createPlayer('p2', 'Bob'),
        createPlayer('p3', 'Charlie'),
      ]

      dealCards(players, deck)

      const allDealt = [
        ...players[0].hand,
        ...players[1].hand,
        ...players[2].hand,
      ]
      const ids = new Set(allDealt.map((c) => c.id))
      expect(ids.size).toBe(21) // 7 × 3
    })

    it('should deal custom count of cards', () => {
      const deck = shuffleDeck(buildDeck())
      const players: Player[] = [createPlayer('p1', 'Alice')]

      dealCards(players, deck, 3)

      expect(players[0].hand).toHaveLength(3)
    })

    it('should handle 4 players without running out of cards', () => {
      const deck = shuffleDeck(buildDeck())
      const players: Player[] = [
        createPlayer('p1', 'Alice'),
        createPlayer('p2', 'Bob'),
        createPlayer('p3', 'Charlie'),
        createPlayer('p4', 'Diana'),
      ]

      dealCards(players, deck)

      for (const player of players) {
        expect(player.hand).toHaveLength(7)
      }

      // 86 cards - 28 dealt = 58 remaining
      expect(deck.length).toBe(58)
    })
  })

  describe('pickStartingPlayer', () => {
    it('should return a valid index', () => {
      const { startIndex } = pickStartingPlayer(4)
      expect(startIndex).toBeGreaterThanOrEqual(0)
      expect(startIndex).toBeLessThan(4)
    })

    it('should return a valid direction', () => {
      const { direction } = pickStartingPlayer(4)
      expect([
        TurnDirection.Clockwise,
        TurnDirection.CounterClockwise,
      ]).toContain(direction)
    })

    it('should work with 2 players', () => {
      const { startIndex } = pickStartingPlayer(2)
      expect(startIndex).toBeGreaterThanOrEqual(0)
      expect(startIndex).toBeLessThan(2)
    })
  })
})

function createPlayer(id: string, name: string): Player {
  return {
    id,
    socketId: `socket-${id}`,
    name,
    hand: [],
    isEliminated: false,
    canReturn: false,
  }
}
