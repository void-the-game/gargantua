export enum CardType {
  Essence = 'essence',
  Joker = 'joker',
  BlackHole = 'black_hole',
  Vortex = 'vortex',
  BuyPlus1 = 'buy_plus_1',
  BuyPlus2 = 'buy_plus_2',
  StealNextOne = 'steal_next_1',
  StealPrevOne = 'steal_prev_1',
  StealAnyOne = 'steal_any_1',
  Trap = 'trap',
  Recycle = 'recycle',
  BlockPurchase = 'block_purchase',
  SwapNextHand = 'swap_next_hand',
  SwapPrevHand = 'swap_prev_hand',
  SwapAnyHand = 'swap_any_hand',
  ExtraPower = 'extra_power',
  BlockSteal = 'block_steal',
  Reflect = 'reflect',
  Nullify = 'nullify',
}

export enum CardColor {
  Blue = 'blue',
  Green = 'green',
  Yellow = 'yellow',
  Purple = 'purple',
  White = 'white',
}

export interface Card {
  id: string
  type: CardType
  color: CardColor
  value: number
}

/** Cards that can be played out of turn as interrupts */
export const REACTIVE_CARDS: CardType[] = [
  CardType.BlockSteal,
  CardType.Reflect,
  CardType.Nullify,
]

/** Cards that trigger steal effects (and can be interrupted) */
export const STEAL_CARDS: CardType[] = [
  CardType.StealNextOne,
  CardType.StealPrevOne,
  CardType.StealAnyOne,
]

/** Cards with swap effects */
export const SWAP_CARDS: CardType[] = [
  CardType.SwapNextHand,
  CardType.SwapPrevHand,
  CardType.SwapAnyHand,
]
