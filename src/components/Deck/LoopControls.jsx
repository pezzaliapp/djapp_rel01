/**
 * LoopControls — controlli loop e beat jump per un deck
 *
 * - AUTO LOOP: 1/2, 1, 2, 4, 8, 16 battute
 * - IN / OUT: imposta manualmente i punti
 * - LOOP: attiva/disattiva
 * - ◀◀ / ▶▶: dimezza / raddoppia
 * - Beat Jump: salta ±1 ±2 ±4 ±8 battute
 */

import React, { useCallback } from 'react'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'

const AUTO_BEATS = [0.25, 0.5, 1, 2, 4, 8, 16]
const JUMP_BEATS = [1, 2, 4, 8]

export default function LoopControls({ deckId }) {
  const deck = useDeckStore((s) => s.decks[deckId])
  const setLoop = useDeckStore((s) => s.setLoop)

  const deckColor = deckId === 'A' ? 'var(--deck-a)' : 'var(--deck-b)'

  const getLoop = useCallback(() => {
    if (!audioEngine.ready) return null
    try { return audioEngine.deck(deckId).loop } catch { return null }
  }, [deckId])

  const syncLoopState = useCallback(() => {
    const loop = getLoop()
    if (!loop) return
    setLoop(deckId, {
      loopActive: loop.active,
      loopIn: loop.loopIn,
      loopOut: loop.loopOut,
      loopBeats: loop.loopBeats,
    })
  }, [deckId, setLoop, getLoop])

  const handleAutoLoop = useCallback((beats) => {
    const loop = getLoop()
    if (!loop) return
    loop.autoLoop(beats)
    syncLoopState()
  }, [getLoop, syncLoopState])

  const handleLoopIn = useCallback(() => {
    const loop = getLoop()
    if (!loop) return
    if (loop.loopIn !== null && !loop.active) {
      // Toggle: cancella loopIn se già impostato
      loop.loopIn = null
    } else {
      loop.setLoopIn()
    }
    syncLoopState()
  }, [getLoop, syncLoopState])

  const handleLoopOut = useCallback(() => {
    const loop = getLoop()
    if (!loop) return
    if (loop.loopOut !== null && !loop.active) {
      // Toggle: cancella loopOut se già impostato
      loop.loopOut = null
      loop.active = false
    } else {
      loop.setLoopOut()
    }
    syncLoopState()
  }, [getLoop, syncLoopState])

  const handleToggleLoop = useCallback(() => {
    const loop = getLoop()
    if (!loop) return
    loop.toggleLoop()
    syncLoopState()
  }, [getLoop, syncLoopState])

  const handleHalve = useCallback(() => {
    const loop = getLoop()
    if (!loop) return
    loop.halve()
    syncLoopState()
  }, [getLoop, syncLoopState])

  const handleDouble = useCallback(() => {
    const loop = getLoop()
    if (!loop) return
    loop.double()
    syncLoopState()
  }, [getLoop, syncLoopState])

  const handleBeatJump = useCallback((beats) => {
    const loop = getLoop()
    if (!loop) return
    loop.beatJump(beats)
  }, [getLoop])

  const isLoopActive = deck.loopActive

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>

      {/* Label */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-muted)', textAlign: 'center' }}>
        LOOP
      </div>

      {/* Auto loop buttons */}
      <div style={{ display: 'flex', gap: 3 }}>
        {AUTO_BEATS.map((b) => (
          <button
            key={b}
            onClick={() => handleAutoLoop(b)}
            style={{
              flex: 1,
              height: 20,
              border: `1px solid ${isLoopActive && deck.loopBeats === b ? deckColor : 'var(--border-default)'}`,
              background: isLoopActive && deck.loopBeats === b ? deckColor : 'transparent',
              color: isLoopActive && deck.loopBeats === b ? '#000' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {b < 1 ? `1/${Math.round(1/b)}` : b}
          </button>
        ))}
      </div>

      {/* IN / OUT / LOOP / ◀◀ / ▶▶ */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          { label: 'IN',  action: handleLoopIn,    active: deck.loopIn !== null },
          { label: 'OUT', action: handleLoopOut,   active: deck.loopOut !== null },
          { label: isLoopActive ? '⏺ LOOP' : 'LOOP', action: handleToggleLoop, active: isLoopActive },
          { label: '◀◀',  action: handleHalve,     active: false },
          { label: '▶▶',  action: handleDouble,    active: false },
        ].map(({ label, action, active }) => (
          <button
            key={label}
            onClick={action}
            style={{
              flex: 1,
              height: 20,
              border: `1px solid ${active ? deckColor : 'var(--border-default)'}`,
              background: active ? `${deckColor}22` : 'transparent',
              color: active ? deckColor : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.05em',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Beat Jump */}
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', flexShrink: 0 }}>JUMP</span>
        {JUMP_BEATS.map((b) => (
          <React.Fragment key={b}>
            <button
              onClick={() => handleBeatJump(-b)}
              style={jumpBtnStyle}
            >◀{b}</button>
            <button
              onClick={() => handleBeatJump(b)}
              style={jumpBtnStyle}
            >{b}▶</button>
          </React.Fragment>
        )).slice(0, 2)}
        {/* Mostra solo ±1 e ±2 per non sovraffollare */}
      </div>

      {/* Loop info */}
      {isLoopActive && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: deckColor, textAlign: 'center', opacity: 0.8 }}>
          ⏺ {deck.loopBeats > 0 ? `${deck.loopBeats} beat loop` : 'LOOP ACTIVE'}
        </div>
      )}
    </div>
  )
}

const jumpBtnStyle = {
  flex: 1,
  height: 20,
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 8,
  fontWeight: 700,
  borderRadius: 3,
  cursor: 'pointer',
}
