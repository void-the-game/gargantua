import crypto from 'crypto'
import { Card, CardType, CardColor } from '@/shared/types/card-types'
import { Player, TurnDirection } from '@/shared/types/game-types'

/**
 * Card distribution for the Void deck.
 * Each entry: [CardType, CardColor, quantity]
 */
const DECK_DISTRIBUTION: [CardType, CardColor, number][] = [
  // Essências — 16 (4 por cor)
  [CardType.Essence, CardColor.Blue, 4],
  [CardType.Essence, CardColor.Green, 4],
  [CardType.Essence, CardColor.Yellow, 4],
  [CardType.Essence, CardColor.Purple, 4],

  // Coringa — 4 (Sem cor/Branca)
  [CardType.Joker, CardColor.White, 4],

  // Compre +1 — 8 (2 por cor)
  [CardType.BuyPlus1, CardColor.Blue, 2],
  [CardType.BuyPlus1, CardColor.Green, 2],
  [CardType.BuyPlus1, CardColor.Yellow, 2],
  [CardType.BuyPlus1, CardColor.Purple, 2],

  // Compre +2 — 4 (1 por cor)
  [CardType.BuyPlus2, CardColor.Blue, 1],
  [CardType.BuyPlus2, CardColor.Green, 1],
  [CardType.BuyPlus2, CardColor.Yellow, 1],
  [CardType.BuyPlus2, CardColor.Purple, 1],

  // Roube 1 anterior — 4 (1 por cor)
  [CardType.StealPrevOne, CardColor.Blue, 1],
  [CardType.StealPrevOne, CardColor.Green, 1],
  [CardType.StealPrevOne, CardColor.Yellow, 1],
  [CardType.StealPrevOne, CardColor.Purple, 1],

  // Roube 1 próximo — 4 (1 por cor)
  [CardType.StealNextOne, CardColor.Blue, 1],
  [CardType.StealNextOne, CardColor.Green, 1],
  [CardType.StealNextOne, CardColor.Yellow, 1],
  [CardType.StealNextOne, CardColor.Purple, 1],

  // Roube 2 anterior — 4 (1 por cor)
  [CardType.StealPrevTwo, CardColor.Blue, 1],
  [CardType.StealPrevTwo, CardColor.Green, 1],
  [CardType.StealPrevTwo, CardColor.Yellow, 1],
  [CardType.StealPrevTwo, CardColor.Purple, 1],

  // Roube 2 próximo — 4 (1 por cor)
  [CardType.StealNextTwo, CardColor.Blue, 1],
  [CardType.StealNextTwo, CardColor.Green, 1],
  [CardType.StealNextTwo, CardColor.Yellow, 1],
  [CardType.StealNextTwo, CardColor.Purple, 1],

  // Buraco Negro — 4 (1 por cor)
  [CardType.BlackHole, CardColor.Blue, 1],
  [CardType.BlackHole, CardColor.Green, 1],
  [CardType.BlackHole, CardColor.Yellow, 1],
  [CardType.BlackHole, CardColor.Purple, 1],

  // Vórtice — 4 (1 por cor)
  [CardType.Vortex, CardColor.Blue, 1],
  [CardType.Vortex, CardColor.Green, 1],
  [CardType.Vortex, CardColor.Yellow, 1],
  [CardType.Vortex, CardColor.Purple, 1],

  // Reciclar — 4 (1 por cor)
  [CardType.Recycle, CardColor.Blue, 1],
  [CardType.Recycle, CardColor.Green, 1],
  [CardType.Recycle, CardColor.Yellow, 1],
  [CardType.Recycle, CardColor.Purple, 1],

  // Poder Extra — 4 (1 por cor)
  [CardType.ExtraPower, CardColor.Blue, 1],
  [CardType.ExtraPower, CardColor.Green, 1],
  [CardType.ExtraPower, CardColor.Yellow, 1],
  [CardType.ExtraPower, CardColor.Purple, 1],

  // Armadilhas — 6 (Sem cor/Branca)
  [CardType.Trap, CardColor.White, 6],

  // Bloqueia Compras — 2 (Sem cor/Branca)
  [CardType.BlockPurchase, CardColor.White, 2],

  // Bloqueia Roubo — 2 (Sem cor/Branca)
  [CardType.BlockSteal, CardColor.White, 2],

  // Refletir — 4 (Sem cor/Branca)
  [CardType.Reflect, CardColor.White, 4],

  // Roube Qualquer — 2 (Sem cor/Branca)
  [CardType.StealAnyOne, CardColor.White, 2],

  // Anular — 2 (Sem cor/Branca)
  [CardType.Nullify, CardColor.White, 2],

  // Trocar Mão Qualquer — 2 (Sem cor/Branca)
  [CardType.SwapAnyHand, CardColor.White, 2],

  // Trocar Mão Anterior — 1 (Sem cor/Branca)
  [CardType.SwapPrevHand, CardColor.White, 1],

  // Trocar Mão Próximo — 1 (Sem cor/Branca)
  [CardType.SwapNextHand, CardColor.White, 1],
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


