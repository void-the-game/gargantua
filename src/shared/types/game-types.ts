import { Card } from './card-types'

export enum RoomStatus {
  Waiting = 'waiting',
  InProgress = 'in_progress',
  Finished = 'finished',
}

export enum GamePhase {
  Idle = 'idle',
  Draw = 'draw',
  Play = 'play',
  Resolve = 'resolve',
  React = 'react',
  End = 'end',
}

export enum TurnDirection {
  Clockwise = 'clockwise',
  CounterClockwise = 'counter_clockwise',
}

export interface Player {
  id: string
  socketId: string
  name: string
  avatar?: string
  hand: Card[]
  isEliminated: boolean
  canReturn: boolean
  hasUsedExtraLife?: boolean
}

export interface PendingInterrupt {
  type: 'steal' | 'card_played'
  attackerId: string
  targetId?: string
  cardId: string
  context?: {
    targetPlayerId?: string
    recycleCardIds?: string[]
    essenceCardId?: string
  }
  timeoutMs: number
  timeoutHandle?: ReturnType<typeof setTimeout>
  nullifiedPlayerIds: string[]
}

export interface PendingDiscard {
  reason: 'vortex' | 'black_hole'
  sourcePlayerId: string
  requiredColor: string
  remainingTargetIds: string[]
  timeoutHandle?: ReturnType<typeof setTimeout>
}

export interface GameState {
  roomId: string
  players: Player[]
  deck: Card[]
  discardPile: Card[]
  currentTurnIndex: number
  direction: TurnDirection
  turnNumber: number
  phase: GamePhase
  pendingInterrupt: PendingInterrupt | null
  pendingDiscard: PendingDiscard | null
  /** Set by BlockPurchase card: marks that the purchase is blocked for N-1 turns. */
  blockPurchaseTurnsRemaining: number
  /** Set by advanceTurn when entering a blocked turn. Read by handleBuyPlus to block card effects. Cleared at the start of the following advanceTurn. */
  purchaseBlockedThisTurn: boolean
  hasPlayedCardThisTurn: boolean
}

export interface Room {
  id: string
  code: string
  name: string
  isPrivate: boolean
  hostId: string
  players: Pick<Player, 'id' | 'socketId' | 'name' | 'avatar'>[]
  status: RoomStatus
  gameState: GameState | null
  createdAt: Date
}

/** Filtered view sent to each player — hides other players' hands */
export interface HiddenHand {
  count: number
}

export interface PlayerView {
  roomId: string
  players: (Omit<Player, 'hand'> & { hand: Card[] | HiddenHand })[]
  deck: { remaining: number }
  discardPile: Card[]
  currentTurnIndex: number
  direction: TurnDirection
  turnNumber: number
  phase: GamePhase
  pendingInterrupt: Omit<PendingInterrupt, 'timeoutHandle'> | null
  pendingDiscard: Omit<PendingDiscard, 'timeoutHandle'> | null
  blockPurchaseTurnsRemaining: number
  purchaseBlockedThisTurn: boolean
  hasPlayedCardThisTurn: boolean
}
