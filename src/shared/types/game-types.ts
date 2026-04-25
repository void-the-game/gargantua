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
  hand: Card[]
  isEliminated: boolean
  canReturn: boolean
}

export interface PendingInterrupt {
  type: 'steal' | 'card_played'
  attackerId: string
  targetId: string
  cardId: string
  timeoutMs: number
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
  blockPurchaseFlag: boolean
  hasPlayedCardThisTurn: boolean
}

export interface Room {
  id: string
  code: string
  players: Pick<Player, 'id' | 'socketId' | 'name'>[]
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
  blockPurchaseFlag: boolean
  hasPlayedCardThisTurn: boolean
}
