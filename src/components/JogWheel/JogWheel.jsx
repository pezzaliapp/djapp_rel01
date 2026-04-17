/**
 * JogWheel — comportamento DJ reale
 *
 * SCRATCH (modalità SCRATCH attiva):
 *   - Touch/click sul piatto → scratchStart() → musica si ferma
 *   - Muovi → scratchMove(delta) → posizione segue la mano
 *   - Rilascia → scratchEnd() → musica riparte
 *
 * NUDGE (modalità NUDGE attiva):
 *   - Trascina il piatto → nudge(delta) → velocità +/-
 *   - Rilascia → nudgeRelease() → velocità normale
 *
 * Multitouch: ogni deck traccia il proprio touchId.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { registerJogRef, resolveTouchDeck, releaseTouchId } from '@hooks/useMultitouch.js'
import { getAngleDeg, angleDelta, getElementCenter } from '@utils/angleUtils.js'
import { audioEngine } from '@audio/AudioEngine.js'
import { useDeckStore } from '@store/useDeckStore.js'
import styles from './JogWheel.module.css'

export default function JogWheel({ deckId }) {
  const svgRef = useRef(null)
  const jogMode = useDeckStore((s) => s.decks[deckId]?.jogMode ?? 'nudge')
  const setJogAngle = useDeckStore((s) => s.setJogAngle)

  // Stato gesto attivo
  const gesture = useRef({
    active: false,
    prevAngle: 0,
    prevTime: 0,
    touchId: null,
  })

  // Angolo visuale del piatto
  const [visualAngle, setVisualAngle] = useState(0)
  const visualAngleRef = useRef(0)
  const animRef = useRef(null)
  const lastFrameRef = useRef(0)

  const deckColor = deckId === 'A' ? 'var(--deck-a)' : 'var(--deck-b)'

  // Registra elemento per multitouch
  useEffect(() => {
    registerJogRef(deckId, svgRef.current)
    return () => registerJogRef(deckId, null)
  }, [deckId])

  // Animazione rotazione durante playback
  useEffect(() => {
    const RPM = 33.3
    const DEG_PER_MS = (RPM * 360) / 60000

    const tick = (ts) => {
      if (lastFrameRef.current > 0 && !gesture.current.active) {
        try {
          const eng = audioEngine.ready ? audioEngine.deck(deckId) : null
          if (eng?.playing && !eng?.scratchActive) {
            const dt = ts - lastFrameRef.current
            visualAngleRef.current = (visualAngleRef.current + DEG_PER_MS * dt) % 360
            setVisualAngle(visualAngleRef.current)
          }
        } catch (_) {}
      }
      lastFrameRef.current = ts
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [deckId])

  // ── Gesto start ───────────────────────────────────────

  const onGestureStart = useCallback((clientX, clientY, touchId = null) => {
    const el = svgRef.current
    if (!el) return
    const { cx, cy } = getElementCenter(el)
    const angle = getAngleDeg(clientX, clientY, cx, cy)

    gesture.current = { active: true, prevAngle: angle, prevTime: performance.now(), touchId }

    if (!audioEngine.ready) return
    try {
      const eng = audioEngine.deck(deckId)
      if (jogMode === 'scratch') {
        eng.scratchStart()
      }
    } catch (_) {}
  }, [deckId, jogMode])

  // ── Gesto move ────────────────────────────────────────

  const onGestureMove = useCallback((clientX, clientY) => {
    if (!gesture.current.active) return
    const el = svgRef.current
    if (!el) return

    const { cx, cy } = getElementCenter(el)
    const angle = getAngleDeg(clientX, clientY, cx, cy)
    const now = performance.now()
    const delta = angleDelta(gesture.current.prevAngle, angle)

    if (Math.abs(delta) < 0.3) return

    // Aggiorna angolo visuale
    visualAngleRef.current = (visualAngleRef.current + delta + 360) % 360
    setVisualAngle(visualAngleRef.current)
    setJogAngle(deckId, visualAngleRef.current)

    // Azione audio
    if (audioEngine.ready) {
      try {
        const eng = audioEngine.deck(deckId)
        if (jogMode === 'scratch') {
          eng.scratchMove(delta)
        } else {
          eng.nudge(delta)
        }
      } catch (_) {}
    }

    gesture.current.prevAngle = angle
    gesture.current.prevTime = now
  }, [deckId, jogMode, setJogAngle])

  // ── Gesto end ─────────────────────────────────────────

  const onGestureEnd = useCallback(() => {
    if (!gesture.current.active) return
    gesture.current.active = false

    if (audioEngine.ready) {
      try {
        const eng = audioEngine.deck(deckId)
        if (jogMode === 'scratch') {
          eng.scratchEnd()
        } else {
          eng.nudgeRelease()
        }
      } catch (_) {}
    }
  }, [deckId, jogMode])

  // ── Touch handlers ────────────────────────────────────

  const onTouchStart = useCallback((e) => {
    e.preventDefault()
    for (const touch of e.changedTouches) {
      const owner = resolveTouchDeck(touch)
      if (owner === deckId) {
        if (gesture.current.active) break
        onGestureStart(touch.clientX, touch.clientY, touch.identifier)
        break
      }
    }
  }, [deckId, onGestureStart])

  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    for (const touch of e.changedTouches) {
      if (touch.identifier === gesture.current.touchId) {
        onGestureMove(touch.clientX, touch.clientY)
        break
      }
    }
  }, [onGestureMove])

  const onTouchEnd = useCallback((e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === gesture.current.touchId) {
        releaseTouchId(touch.identifier)
        onGestureEnd()
        break
      }
    }
  }, [onGestureEnd])

  // ── Mouse handlers ────────────────────────────────────

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    onGestureStart(e.clientX, e.clientY, null)

    const onMove = (ev) => onGestureMove(ev.clientX, ev.clientY)
    const onUp = () => {
      onGestureEnd()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onGestureStart, onGestureMove, onGestureEnd])

  const isActive = gesture.current.active

  return (
    <div className={styles.jogContainer} data-touch-lock data-deck={deckId}>
      <div className={styles.modeLabel} style={{ color: deckColor }}>
        {jogMode.toUpperCase()}
      </div>

      <svg
        ref={svgRef}
        className={styles.jogSvg}
        viewBox="0 0 300 300"
        xmlns="http://www.w3.org/2000/svg"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{ touchAction: 'none', cursor: jogMode === 'scratch' ? 'crosshair' : 'grab' }}
      >
        {/* Ring esterno */}
        <circle cx="150" cy="150" r="148" fill="none"
          stroke={isActive ? deckColor : '#222'} strokeWidth="3" opacity={isActive ? 0.8 : 1} />

        {/* Piatto rotante */}
        <g transform={`rotate(${visualAngle}, 150, 150)`}>
          <circle cx="150" cy="150" r="142" fill="#111" />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * 15 * Math.PI) / 180
            const x1 = 150 + Math.cos(a) * 92
            const y1 = 150 + Math.sin(a) * 92
            const x2 = 150 + Math.cos(a) * 138
            const y2 = 150 + Math.sin(a) * 138
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2a2a2a" strokeWidth="1.5" />
          })}
          {/* Marker posizione */}
          <circle cx="150" cy="14" r="5" fill={deckColor} opacity="0.9" />
          {/* Anello medio */}
          <circle cx="150" cy="150" r="88" fill="none" stroke="#1e1e1e" strokeWidth="22" />
          <circle cx="150" cy="150" r="88" fill="none" stroke="#252525" strokeWidth="1" />
        </g>

        {/* Hub centrale fisso */}
        <circle cx="150" cy="150" r="52" fill="#0a0a0a" stroke="#222" strokeWidth="1" />
        <circle cx="150" cy="150" r="32" fill="#080808"
          stroke={deckColor} strokeWidth="1.5" opacity={isActive ? 0.9 : 0.3} />
        <text x="150" y="158" textAnchor="middle" fontSize="24" fontWeight="700"
          fontFamily="var(--font-mono)" fill={deckColor} opacity={isActive ? 1 : 0.7}
          style={{ userSelect: 'none' }}>
          {deckId}
        </text>
      </svg>

      <div className={styles.angleDisplay} style={{ color: deckColor }}>
        {Math.round(visualAngle)}°
      </div>
    </div>
  )
}
