import { GameState, Player, TurnDirection } from '@/shared/types/game-types'

/**
 * Advance the turn to the next active (non-eliminated) player.
 */
export function advanceTurn(state: GameState): void {
  const step = state.direction === TurnDirection.Clockwise ? 1 : -1
  const playerCount = state.players.length

  let nextIndex = state.currentTurnIndex
  let attempts = 0

  do {
    nextIndex = ((nextIndex + step) % playerCount + playerCount) % playerCount
    attempts++
    if (attempts > playerCount) break // safety: avoid infinite loop
  } while (state.players[nextIndex].isEliminated)

  state.currentTurnIndex = nextIndex
  state.turnNumber++
  state.hasPlayedCardThisTurn = false
}

/**
 * Get the current active player.
 */
export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentTurnIndex]
}

/**
 * Get the next player (respecting direction, skipping eliminated).
 */
export function getNextPlayer(state: GameState): Player {
  const step = state.direction === TurnDirection.Clockwise ? 1 : -1
  const playerCount = state.players.length
  let nextIndex = state.currentTurnIndex

  do {
    nextIndex = ((nextIndex + step) % playerCount + playerCount) % playerCount
  } while (state.players[nextIndex].isEliminated && nextIndex !== state.currentTurnIndex)

  return state.players[nextIndex]
}

/**
 * Get the previous player (respecting direction, skipping eliminated).
 */
export function getPreviousPlayer(state: GameState): Player {
  const step = state.direction === TurnDirection.Clockwise ? -1 : 1
  const playerCount = state.players.length
  let prevIndex = state.currentTurnIndex

  do {
    prevIndex = ((prevIndex + step) % playerCount + playerCount) % playerCount
  } while (state.players[prevIndex].isEliminated && prevIndex !== state.currentTurnIndex)

  return state.players[prevIndex]
}

/**
 * Get a specific player by ID.
 */
export function getPlayerById(
  state: GameState,
  playerId: string
): Player | undefined {
  return state.players.find((p) => p.id === playerId)
}

/**
 * Get all active (non-eliminated) opponents of the current player.
 */
export function getActiveOpponents(state: GameState): Player[] {
  const current = getCurrentPlayer(state)
  return state.players.filter(
    (p) => p.id !== current.id && !p.isEliminated
  )
}

/**
 * Get all active (non-eliminated) players.
 */
export function getActivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.isEliminated)
}

/**
 * Check if a player has been eliminated (hand is empty after playing).
 * Returns the IDs of newly eliminated players.
 */
export function checkElimination(state: GameState): string[] {
  const eliminated: string[] = []

  for (const player of state.players) {
    if (!player.isEliminated && player.hand.length === 0) {
      player.isEliminated = true
      player.canReturn = true
      eliminated.push(player.id)
    }
  }

  return eliminated
}

/**
 * Try to return an eliminated player.
 * If canReturn and deck has cards, draw 3 cards and return to the game.
 * Returns true if the player returned.
 */
export function tryPlayerReturn(
  state: GameState,
  player: Player
): boolean {
  if (!player.isEliminated || !player.canReturn || state.deck.length === 0) {
    return false
  }

  const cardsToDraw = Math.min(3, state.deck.length)
  player.hand = state.deck.splice(0, cardsToDraw)
  player.isEliminated = false
  player.canReturn = false

  return true
}

/**
 * Check if the match should end (only 1 active player remaining).
 * Returns the winner ID or null if the match continues.
 */
export function checkMatchEnd(state: GameState): string | null {
  const activePlayers = getActivePlayers(state)

  if (activePlayers.length <= 1) {
    return activePlayers[0]?.id ?? null
  }

  return null
}

/**
 * Draw cards from the deck into a player's hand.
 * Returns the number of cards actually drawn.
 */
export function drawCards(
  state: GameState,
  player: Player,
  count: number
): number {
  const available = Math.min(count, state.deck.length)
  const drawn = state.deck.splice(0, available)
  player.hand.push(...drawn)
  return available
}
