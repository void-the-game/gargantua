interface GameErrorOptions {
  code: string
  statusCode?: number
  cause?: Error
}

function createGameError(
  message: string,
  options: GameErrorOptions
): Error & { code: string; statusCode: number } {
  const error = new Error(message) as Error & {
    code: string
    statusCode: number
    cause?: Error
  }
  error.code = options.code
  error.statusCode = options.statusCode ?? 400
  if (options.cause) {
    error.cause = options.cause
  }
  Error.captureStackTrace(error, createGameError)
  return error
}

export function isGameError(
  error: unknown
): error is Error & { code: string; statusCode: number } {
  return error instanceof Error && 'code' in error && 'statusCode' in error
}

// Room errors
export const roomFull = () =>
  createGameError('Room is full (max 4 players)', { code: 'ROOM_FULL' })

export const roomNotFound = () =>
  createGameError('Room not found', { code: 'ROOM_NOT_FOUND' })

export const playerAlreadyInRoom = () =>
  createGameError('Player already in this room', {
    code: 'PLAYER_ALREADY_IN_ROOM',
  })

export const roomNotWaiting = () =>
  createGameError('Room is not in waiting state', {
    code: 'ROOM_NOT_WAITING',
  })

// Match errors
export const notEnoughPlayers = () =>
  createGameError('At least 2 players required to start', {
    code: 'NOT_ENOUGH_PLAYERS',
  })

export const matchAlreadyStarted = () =>
  createGameError('Match already in progress', {
    code: 'MATCH_ALREADY_STARTED',
  })

// Game action errors
export const invalidDiscard = (msg: string) =>
  createGameError(msg, { code: 'INVALID_DISCARD' })

export const notYourTurn = () =>
  createGameError('It is not your turn', { code: 'NOT_YOUR_TURN' })

export const cardNotInHand = () =>
  createGameError('Card not found in your hand', {
    code: 'CARD_NOT_IN_HAND',
  })

export const mustPlayCardFirst = () =>
  createGameError('You must play a card before passing', {
    code: 'MUST_PLAY_CARD_FIRST',
  })

export const alreadyPlayedCard = () =>
  createGameError('You already played a card this turn', {
    code: 'ALREADY_PLAYED_CARD',
  })

export const noActiveMatch = () =>
  createGameError('No active match in this room', {
    code: 'NO_ACTIVE_MATCH',
  })

export const noActiveSession = () =>
  createGameError('No active session found for reconnection', {
    code: 'NO_ACTIVE_SESSION',
  })

// Interrupt errors
export const noInterruptAvailable = () =>
  createGameError('No pending interrupt to respond to', {
    code: 'NO_INTERRUPT_AVAILABLE',
  })

export const cannotNullifyExtraPower = () =>
  createGameError('Cannot nullify Extra Power cards', {
    code: 'CANNOT_NULLIFY_EXTRA_POWER',
  })

export const notRoomHost = () =>
  createGameError('Only the host can start the match', {
    code: 'NOT_ROOM_HOST',
    statusCode: 403,
  })
