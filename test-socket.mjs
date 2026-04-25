/**
 * Script de teste manual para Socket.IO do Void.
 *
 * Uso:
 *   node test-socket.mjs
 *
 * Simula dois jogadores criando uma sala, entrando,
 * iniciando partida, jogando uma carta e passando o turno.
 */

import { io } from 'socket.io-client'

const SERVER_URL = 'http://localhost:3000'

// Helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (tag, ...args) => console.log(`[${tag}]`, ...args)

// ─── Player A ────────────────────────────────────────────────
const playerA = io(SERVER_URL)
const playerB = io(SERVER_URL)

// Listen to all events (debug)
for (const [name, socket] of [['A', playerA], ['B', playerB]]) {
  socket.onAny((event, data) => {
    log(name, `← ${event}`, JSON.stringify(data, null, 2).slice(0, 300))
  })

  socket.on('connect', () => log(name, `connected: ${socket.id}`))
  socket.on('disconnect', (reason) => log(name, `disconnected: ${reason}`))
  socket.on('error', (err) => log(name, `ERROR:`, err))
}

async function main() {
  // Esperar conexão
  await sleep(1000)
  log('TEST', '━━━ Step 1: Player A creates a room ━━━')

  // Player A cria sala
  playerA.emit('room:create', { playerName: 'Alice' }, (response) => {
    log('A', 'room:create callback:', response)
  })

  await sleep(500)

  // Pegar código da sala do evento room:created
  const roomCode = await new Promise((resolve) => {
    playerA.once('room:created', (data) => {
      log('TEST', `Room created with code: ${data.code}`)
      resolve(data.code)
    })
    // Re-emit in case event already fired
    playerA.emit('room:create', { playerName: 'Alice' })
  })

  log('TEST', '━━━ Step 2: Player B joins the room ━━━')

  playerB.emit('room:join', { code: roomCode, playerName: 'Bob' })
  await sleep(500)

  log('TEST', '━━━ Step 3: Player A starts the match ━━━')

  // Precisamos do roomId
  const roomId = await new Promise((resolve) => {
    playerA.once('state:update', (state) => {
      resolve(state.roomId)
    })
    // Pegar roomId da room:created (já recebido)
    // Vamos emitir room:create de novo para pegar — ou usar o callback
  })

  // Na verdade, vamos simplificar: ouvir state:update do match:start
  let matchState = null

  playerA.once('state:update', (state) => {
    matchState = state
    log('TEST', `Match started! Turn: player ${state.currentTurnIndex}`)
    log('TEST', `My hand (Alice): ${state.players.find(p => p.hand?.length > 0)?.hand?.length || '?'} cards`)
    log('TEST', `Deck remaining: ${state.deck?.remaining}`)
  })

  // Emitir match:start — precisa do roomId
  // O roomId foi retornado no room:created callback
  // Vamos ouvir e reagir
  playerA.emit('match:start', { roomId })

  await sleep(1000)

  if (matchState) {
    log('TEST', '━━━ Step 4: Current player plays a card ━━━')

    const myPlayer = matchState.players.find(
      (p) => Array.isArray(p.hand) && p.hand.length > 0
    )

    if (myPlayer && myPlayer.hand.length > 0) {
      const card = myPlayer.hand[0]
      log('TEST', `Playing card: ${card.type} (${card.color}) id=${card.id}`)

      const currentSocket =
        matchState.currentTurnIndex === 0 ? playerA : playerB

      currentSocket.emit('card:play', {
        roomId: matchState.roomId,
        cardId: card.id,
      })

      await sleep(500)

      log('TEST', '━━━ Step 5: Current player passes turn ━━━')
      currentSocket.emit('turn:pass', { roomId: matchState.roomId })

      await sleep(500)
    }
  }

  log('TEST', '━━━ Step 6: Player B leaves ━━━')
  playerB.emit('room:leave')
  await sleep(300)

  log('TEST', '━━━ Done! ━━━')

  playerA.disconnect()
  playerB.disconnect()

  // Force exit after cleanup
  setTimeout(() => process.exit(0), 500)
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
