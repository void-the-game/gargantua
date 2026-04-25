import { Card, CardType } from './card-types'

// ─── Event Constants ─────────────────────────────────────────────

export const SocketEvents = {
  // Room
  ROOM_CREATE: 'room:create',
  ROOM_CREATED: 'room:created',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_PLAYER_JOINED: 'room:player_joined',
  ROOM_PLAYER_LEFT: 'room:player_left',

  // Match
  MATCH_START: 'match:start',
  MATCH_END: 'match:end',

  // Game Actions
  CARD_PLAY: 'card:play',
  CARD_PLAYED: 'card:played',
  TURN_PASS: 'turn:pass',

  // State
  STATE_UPDATE: 'state:update',
  STATE_REQUEST: 'state:request',

  // Interrupts
  INTERRUPT_AVAILABLE: 'interrupt:available',
  INTERRUPT_PLAY: 'interrupt:play',
  INTERRUPT_TIMEOUT: 'interrupt:timeout',

  // Player
  PLAYER_ELIMINATED: 'player:eliminated',
  PLAYER_RETURNED: 'player:returned',

  // Errors
  ERROR: 'error',
} as const

// ─── Payload Types ───────────────────────────────────────────────

/** Client → Server: create a new room */
export interface RoomCreatePayload {
  playerName: string
}

/** Server → Client: room was created */
export interface RoomCreatedPayload {
  roomId: string
  code: string
}

/** Client → Server: join an existing room */
export interface RoomJoinPayload {
  code: string
  playerName: string
}

/** Server → Room: a player joined */
export interface RoomPlayerJoinedPayload {
  playerId: string
  playerName: string
  players: { id: string; name: string }[]
}

/** Server → Room: a player left */
export interface RoomPlayerLeftPayload {
  playerId: string
  players: { id: string; name: string }[]
}

/** Client → Server: start the match */
export interface MatchStartPayload {
  roomId: string
}

/** Server → Room: match ended */
export interface MatchEndPayload {
  winnerId: string
  winnerName: string
}

/** Client → Server: play a card */
export interface CardPlayPayload {
  roomId: string
  cardId: string
  targetPlayerId?: string // for steal/swap targeting a specific player
  recycleCardIds?: string[] // for Recycle — cards to discard
  essenceCardId?: string // for ExtraPower — accompanying essence card
}

/** Server → Room: a card was played (public info) */
export interface CardPlayedPayload {
  playerId: string
  playerName: string
  card: {
    type: CardType
    color: Card['color']
  }
  effectDescription: string
}

/** Client → Server: pass the turn */
export interface TurnPassPayload {
  roomId: string
}

/** Client → Server: request current state (for reconnection) */
export interface StateRequestPayload {
  roomId: string
}

/** Server → Target: an interrupt is available */
export interface InterruptAvailablePayload {
  interruptType: 'steal' | 'card_played'
  attackerId: string
  attackerName: string
  cardType: CardType
  timeoutMs: number
  availableResponses: CardType[] // which reactive cards the target has
}

/** Client → Server: play an interrupt card */
export interface InterruptPlayPayload {
  roomId: string
  cardId: string
}

/** Server → Room: a player was eliminated */
export interface PlayerEliminatedPayload {
  playerId: string
  playerName: string
}

/** Server → Room: a player returned from elimination */
export interface PlayerReturnedPayload {
  playerId: string
  playerName: string
  cardsDrawn: number
}

/** Server → Client: error occurred */
export interface SocketErrorPayload {
  code: string
  message: string
}
