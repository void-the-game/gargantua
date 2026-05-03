import crypto from 'crypto'
import { Card, CardType, CardColor } from '@/shared/types/card-types'
import { Player, TurnDirection } from '@/shared/types/game-types'

/**
 * Card distribution for the Void deck.
 * Each entry: [CardType, CardColor, quantity]
 */
const DECK_DISTRIBUTION: [CardType, CardColor, number][] = [
  // Essências — 4 por cor × 4 cores = 16
  [CardType.Essence, CardColor.Blue, 4],
  [CardType.Essence, CardColor.Green, 4],
  [CardType.Essence, CardColor.Yellow, 4],
  [CardType.Essence, CardColor.Purple, 4],

  // Coringa — 4 (sem cor específica, usamos White como neutro)
  [CardType.Joker, CardColor.White, 4],

  // Buraco Negro — 4 (1 por cor, exceto White)
  [CardType.BlackHole, CardColor.Blue, 1],
  [CardType.BlackHole, CardColor.Green, 1],
  [CardType.BlackHole, CardColor.Yellow, 1],
  [CardType.BlackHole, CardColor.Purple, 1],

  // Vórtice — 4
  [CardType.Vortex, CardColor.Blue, 1],
  [CardType.Vortex, CardColor.Green, 1],
  [CardType.Vortex, CardColor.Yellow, 1],
  [CardType.Vortex, CardColor.Purple, 1],

  // Compre +1 — 4
  [CardType.BuyPlus1, CardColor.Blue, 1],
  [CardType.BuyPlus1, CardColor.Green, 1],
  [CardType.BuyPlus1, CardColor.Yellow, 1],
  [CardType.BuyPlus1, CardColor.Purple, 1],

  // Compre +2 — 4
  [CardType.BuyPlus2, CardColor.Blue, 1],
  [CardType.BuyPlus2, CardColor.Green, 1],
  [CardType.BuyPlus2, CardColor.Yellow, 1],
  [CardType.BuyPlus2, CardColor.Purple, 1],

  // Roube 1 do próximo — 4
  [CardType.StealNextOne, CardColor.Blue, 1],
  [CardType.StealNextOne, CardColor.Green, 1],
  [CardType.StealNextOne, CardColor.Yellow, 1],
  [CardType.StealNextOne, CardColor.Purple, 1],

  // Roube 1 do anterior — 4
  [CardType.StealPrevOne, CardColor.Blue, 1],
  [CardType.StealPrevOne, CardColor.Green, 1],
  [CardType.StealPrevOne, CardColor.Yellow, 1],
  [CardType.StealPrevOne, CardColor.Purple, 1],

  // Roube 1 de qualquer — 2
  [CardType.StealAnyOne, CardColor.Blue, 1],
  [CardType.StealAnyOne, CardColor.Purple, 1],

  // Armadilha — 4
  [CardType.Trap, CardColor.Blue, 1],
  [CardType.Trap, CardColor.Green, 1],
  [CardType.Trap, CardColor.Yellow, 1],
  [CardType.Trap, CardColor.Purple, 1],

  // Reciclar — 4
  [CardType.Recycle, CardColor.Blue, 1],
  [CardType.Recycle, CardColor.Green, 1],
  [CardType.Recycle, CardColor.Yellow, 1],
  [CardType.Recycle, CardColor.Purple, 1],

  // Bloqueia Compras — 2
  [CardType.BlockPurchase, CardColor.Blue, 1],
  [CardType.BlockPurchase, CardColor.Green, 1],

  // Trocar mão (próximo) — 2
  [CardType.SwapNextHand, CardColor.Yellow, 1],
  [CardType.SwapNextHand, CardColor.Purple, 1],

  // Trocar mão (anterior) — 2
  [CardType.SwapPrevHand, CardColor.Blue, 1],
  [CardType.SwapPrevHand, CardColor.Green, 1],

  // Trocar mão (qualquer) — 1
  [CardType.SwapAnyHand, CardColor.White, 1],

  // Poder Extra — 4 (1 por cor)
  [CardType.ExtraPower, CardColor.Blue, 1],
  [CardType.ExtraPower, CardColor.Green, 1],
  [CardType.ExtraPower, CardColor.Yellow, 1],
  [CardType.ExtraPower, CardColor.Purple, 1],

  // Bloqueia Roubo — 4
  [CardType.BlockSteal, CardColor.Blue, 1],
  [CardType.BlockSteal, CardColor.Green, 1],
  [CardType.BlockSteal, CardColor.Yellow, 1],
  [CardType.BlockSteal, CardColor.Purple, 1],

  // Refletir — 2
  [CardType.Reflect, CardColor.Blue, 1],
  [CardType.Reflect, CardColor.Purple, 1],

  // Anular — 2
  [CardType.Nullify, CardColor.Green, 1],
  [CardType.Nullify, CardColor.Yellow, 1],
]

/**
 * Build the full Void deck based on official card distribution.
 */
export function buildDeck(): Card[] {
  const deck: Card[] = []
  let cardIndex = 0

  for (const [type, color, quantity] of DECK_DISTRIBUTION) {
    for (let i = 0; i < quantity; i++) {
      deck.push({
        id: `card-${cardIndex++}`,
        type,
        color,
        value: getCardValue(type),
      })
    }
  }

  return deck
}

/**
 * Fisher-Yates shuffle — in-place, cryptographically random.
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4)
    const j = randomBytes.readUInt32BE(0) % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Deal `count` cards to each player from the deck.
 * Mutates the deck (removes dealt cards).
 */
export function dealCards(
  players: Player[],
  deck: Card[],
  count = 7
): void {
  for (const player of players) {
    player.hand = deck.splice(0, count)
  }
}

/**
 * Pick a random starting player and direction.
 */
export function pickStartingPlayer(
  playerCount: number
): { startIndex: number; direction: TurnDirection } {
  const randomBytes = crypto.randomBytes(4)
  const startIndex = randomBytes.readUInt32BE(0) % playerCount
  const directionByte = crypto.randomBytes(1)[0]
  const direction =
    directionByte % 2 === 0
      ? TurnDirection.Clockwise
      : TurnDirection.CounterClockwise

  return { startIndex, direction }
}

/**
 * Get the base value (point worth) of a card type.
 */
function getCardValue(type: CardType): number {
  switch (type) {
    case CardType.Essence:
      return 1
    case CardType.Joker:
      return 0
    case CardType.BlackHole:
    case CardType.Vortex:
      return 3
    case CardType.BuyPlus1:
      return 1
    case CardType.BuyPlus2:
      return 2
    case CardType.StealNextOne:
    case CardType.StealPrevOne:
    case CardType.StealAnyOne:
      return 2
    case CardType.Trap:
      return 2
    case CardType.Recycle:
      return 1
    case CardType.BlockPurchase:
      return 2
    case CardType.SwapNextHand:
    case CardType.SwapPrevHand:
    case CardType.SwapAnyHand:
      return 3
    case CardType.ExtraPower:
      return 4
    case CardType.BlockSteal:
    case CardType.Reflect:
    case CardType.Nullify:
      return 2
    default:
      return 0
  }
}
